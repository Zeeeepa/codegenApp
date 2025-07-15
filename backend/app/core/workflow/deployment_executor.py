"""
CodegenApp Deployment Executor
Executes deployment commands with real-time monitoring and SWE-bench integration
"""

import asyncio
import os
import signal
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any, AsyncGenerator
import subprocess

from app.config.settings import get_settings
from app.core.logging import get_logger
from app.models.validation import DeploymentResult
from app.utils.exceptions import DeploymentException, DeploymentTimeoutException

logger = get_logger(__name__)
settings = get_settings()


class CommandExecutor:
    """
    Individual command execution with monitoring
    
    Handles single command execution with real-time output capture,
    timeout management, and resource monitoring.
    """
    
    def __init__(self, command: str, working_directory: str, environment: Dict[str, str]):
        self.command = command
        self.working_directory = working_directory
        self.environment = environment
        self.process: Optional[asyncio.subprocess.Process] = None
        self.start_time: Optional[datetime] = None
        self.stdout_lines: List[str] = []
        self.stderr_lines: List[str] = []
    
    async def execute(self, timeout: int = 600) -> DeploymentResult:
        """
        Execute command with timeout and monitoring
        
        Args:
            timeout: Command timeout in seconds
            
        Returns:
            DeploymentResult with execution details
        """
        self.start_time = datetime.utcnow()
        
        try:
            logger.info(
                "Executing deployment command",
                command=self.command,
                working_directory=self.working_directory,
                timeout=timeout
            )
            
            # Create subprocess
            self.process = await asyncio.create_subprocess_shell(
                self.command,
                cwd=self.working_directory,
                env={**os.environ, **self.environment},
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=os.setsid if os.name != 'nt' else None
            )
            
            # Monitor execution with timeout
            try:
                stdout, stderr = await asyncio.wait_for(
                    self.process.communicate(),
                    timeout=timeout
                )
                
                duration = (datetime.utcnow() - self.start_time).total_seconds()
                
                result = DeploymentResult(
                    success=self.process.returncode == 0,
                    exit_code=self.process.returncode,
                    stdout=stdout.decode('utf-8', errors='replace'),
                    stderr=stderr.decode('utf-8', errors='replace'),
                    duration=duration,
                    command=self.command,
                    environment=self.environment,
                    working_directory=self.working_directory,
                    timestamp=self.start_time
                )
                
                if result.success:
                    logger.info(
                        "Command executed successfully",
                        command=self.command,
                        duration=duration,
                        exit_code=result.exit_code
                    )
                else:
                    logger.error(
                        "Command execution failed",
                        command=self.command,
                        exit_code=result.exit_code,
                        stderr=result.stderr[:500]  # Log first 500 chars of stderr
                    )
                
                return result
                
            except asyncio.TimeoutError:
                # Kill process group on timeout
                if self.process and self.process.returncode is None:
                    try:
                        if os.name != 'nt':
                            os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                        else:
                            self.process.terminate()
                        
                        # Wait a bit for graceful termination
                        await asyncio.sleep(5)
                        
                        # Force kill if still running
                        if self.process.returncode is None:
                            if os.name != 'nt':
                                os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                            else:
                                self.process.kill()
                            
                    except ProcessLookupError:
                        pass  # Process already terminated
                
                duration = (datetime.utcnow() - self.start_time).total_seconds()
                
                logger.error(
                    "Command execution timed out",
                    command=self.command,
                    timeout=timeout,
                    duration=duration
                )
                
                raise DeploymentTimeoutException(
                    timeout=timeout,
                    details={
                        "command": self.command,
                        "duration": duration,
                        "working_directory": self.working_directory
                    }
                )
                
        except DeploymentTimeoutException:
            raise
        except Exception as e:
            duration = (datetime.utcnow() - self.start_time).total_seconds() if self.start_time else 0
            
            logger.error(
                "Command execution failed with exception",
                command=self.command,
                error=str(e),
                duration=duration
            )
            
            raise DeploymentException(
                f"Command execution failed: {str(e)}",
                details={
                    "command": self.command,
                    "error": str(e),
                    "duration": duration,
                    "working_directory": self.working_directory
                }
            )
    
    async def stream_output(self) -> AsyncGenerator[str, None]:
        """
        Stream real-time output from command execution
        
        Yields output lines as they become available
        """
        if not self.process:
            return
        
        async def read_stream(stream, lines_list):
            while True:
                line = await stream.readline()
                if not line:
                    break
                
                line_str = line.decode('utf-8', errors='replace').rstrip()
                lines_list.append(line_str)
                yield line_str
        
        # Stream both stdout and stderr
        if self.process.stdout:
            async for line in read_stream(self.process.stdout, self.stdout_lines):
                yield f"STDOUT: {line}"
        
        if self.process.stderr:
            async for line in read_stream(self.process.stderr, self.stderr_lines):
                yield f"STDERR: {line}"


class DeploymentExecutor:
    """
    Deployment command executor with SWE-bench integration patterns
    
    Executes deployment commands in sequence with proper error handling,
    logging, and resource management. Integrates patterns from SWE-bench
    for robust command execution and validation.
    """
    
    def __init__(self):
        self.active_executions: Dict[str, CommandExecutor] = {}
        logger.info("DeploymentExecutor initialized")
    
    async def execute_commands(
        self,
        commands: List[str],
        workspace_path: str,
        timeout: int = 600,
        environment: Optional[Dict[str, str]] = None,
        stop_on_failure: bool = True
    ) -> DeploymentResult:
        """
        Execute a sequence of deployment commands
        
        Args:
            commands: List of commands to execute
            workspace_path: Working directory for execution
            timeout: Timeout per command in seconds
            environment: Additional environment variables
            stop_on_failure: Stop execution on first failure
            
        Returns:
            Combined DeploymentResult for all commands
        """
        if not commands:
            raise DeploymentException("No commands provided for execution")
        
        workspace_path_obj = Path(workspace_path)
        if not workspace_path_obj.exists():
            raise DeploymentException(f"Workspace path does not exist: {workspace_path}")
        
        # Prepare environment
        exec_environment = {
            "PATH": os.environ.get("PATH", ""),
            "HOME": os.environ.get("HOME", ""),
            "USER": os.environ.get("USER", ""),
            "PYTHONPATH": str(workspace_path_obj),
            "NODE_PATH": str(workspace_path_obj / "node_modules"),
        }
        
        if environment:
            exec_environment.update(environment)
        
        # Execute commands in sequence
        all_results = []
        combined_stdout = []
        combined_stderr = []
        total_duration = 0.0
        overall_success = True
        final_exit_code = 0
        
        start_time = datetime.utcnow()
        
        logger.info(
            "Starting deployment command execution",
            commands=commands,
            workspace_path=workspace_path,
            timeout=timeout
        )
        
        for i, command in enumerate(commands):
            try:
                # Create command executor
                executor = CommandExecutor(
                    command=command,
                    working_directory=workspace_path,
                    environment=exec_environment
                )
                
                # Store for potential cancellation
                execution_id = f"cmd_{i}_{int(time.time())}"
                self.active_executions[execution_id] = executor
                
                try:
                    # Execute command
                    result = await executor.execute(timeout=timeout)
                    all_results.append(result)
                    
                    # Accumulate outputs
                    combined_stdout.append(f"=== Command {i+1}: {command} ===")
                    combined_stdout.append(result.stdout)
                    combined_stderr.append(result.stderr)
                    
                    total_duration += result.duration
                    
                    # Check for failure
                    if not result.success:
                        overall_success = False
                        final_exit_code = result.exit_code
                        
                        if stop_on_failure:
                            logger.error(
                                "Command failed, stopping execution",
                                command=command,
                                exit_code=result.exit_code
                            )
                            break
                    
                finally:
                    # Clean up active execution
                    if execution_id in self.active_executions:
                        del self.active_executions[execution_id]
                
            except Exception as e:
                overall_success = False
                final_exit_code = 1
                
                error_msg = f"Command failed with exception: {str(e)}"
                combined_stderr.append(f"=== Command {i+1} Error: {command} ===")
                combined_stderr.append(error_msg)
                
                logger.error(
                    "Command execution failed",
                    command=command,
                    error=str(e)
                )
                
                if stop_on_failure:
                    break
        
        # Create combined result
        final_result = DeploymentResult(
            success=overall_success,
            exit_code=final_exit_code,
            stdout="\n".join(combined_stdout),
            stderr="\n".join(combined_stderr),
            duration=total_duration,
            command="; ".join(commands),
            environment=exec_environment,
            working_directory=workspace_path,
            timestamp=start_time
        )
        
        logger.info(
            "Deployment command execution completed",
            success=overall_success,
            total_duration=total_duration,
            commands_executed=len(all_results)
        )
        
        return final_result
    
    async def execute_with_streaming(
        self,
        commands: List[str],
        workspace_path: str,
        timeout: int = 600,
        environment: Optional[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Execute commands with real-time output streaming
        
        Yields output lines as they become available during execution
        """
        for i, command in enumerate(commands):
            yield f"=== Starting Command {i+1}: {command} ==="
            
            try:
                executor = CommandExecutor(
                    command=command,
                    working_directory=workspace_path,
                    environment=environment or {}
                )
                
                # Start execution
                execution_task = asyncio.create_task(executor.execute(timeout))
                
                # Stream output while execution is running
                async for output_line in executor.stream_output():
                    yield output_line
                
                # Wait for completion
                result = await execution_task
                
                yield f"=== Command {i+1} completed with exit code {result.exit_code} ==="
                
                if not result.success:
                    yield f"=== Command {i+1} failed, stopping execution ==="
                    break
                    
            except Exception as e:
                yield f"=== Command {i+1} failed with exception: {str(e)} ==="
                break
    
    async def validate_deployment_environment(self, workspace_path: str) -> Dict[str, Any]:
        """
        Validate deployment environment and dependencies
        
        Checks for required tools, dependencies, and environment setup
        """
        workspace_path_obj = Path(workspace_path)
        validation_results = {
            "workspace_exists": workspace_path_obj.exists(),
            "workspace_writable": False,
            "git_available": False,
            "node_available": False,
            "python_available": False,
            "docker_available": False,
            "dependencies": {}
        }
        
        try:
            # Check workspace writability
            test_file = workspace_path_obj / ".deployment_test"
            test_file.write_text("test")
            test_file.unlink()
            validation_results["workspace_writable"] = True
        except Exception:
            pass
        
        # Check tool availability
        tools_to_check = {
            "git": "git --version",
            "node": "node --version",
            "python": "python3 --version",
            "docker": "docker --version"
        }
        
        for tool, check_command in tools_to_check.items():
            try:
                result = await asyncio.create_subprocess_shell(
                    check_command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await result.communicate()
                
                if result.returncode == 0:
                    validation_results[f"{tool}_available"] = True
                    validation_results["dependencies"][tool] = stdout.decode().strip()
                    
            except Exception:
                pass
        
        # Check for common dependency files
        dependency_files = {
            "package.json": workspace_path_obj / "package.json",
            "requirements.txt": workspace_path_obj / "requirements.txt",
            "Dockerfile": workspace_path_obj / "Dockerfile",
            "docker-compose.yml": workspace_path_obj / "docker-compose.yml"
        }
        
        for dep_name, dep_path in dependency_files.items():
            validation_results["dependencies"][dep_name] = dep_path.exists()
        
        logger.info("Deployment environment validated", results=validation_results)
        return validation_results
    
    async def cancel_execution(self, execution_id: str) -> bool:
        """
        Cancel a running command execution
        
        Args:
            execution_id: ID of execution to cancel
            
        Returns:
            True if cancellation was successful
        """
        if execution_id not in self.active_executions:
            return False
        
        executor = self.active_executions[execution_id]
        
        if executor.process and executor.process.returncode is None:
            try:
                if os.name != 'nt':
                    os.killpg(os.getpgid(executor.process.pid), signal.SIGTERM)
                else:
                    executor.process.terminate()
                
                logger.info("Command execution cancelled", execution_id=execution_id)
                return True
                
            except Exception as e:
                logger.error("Failed to cancel execution", execution_id=execution_id, error=str(e))
                return False
        
        return False
    
    def get_active_executions(self) -> List[str]:
        """Get list of active execution IDs"""
        return list(self.active_executions.keys())

