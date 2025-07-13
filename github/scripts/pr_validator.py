#!/usr/bin/env python3
"""
Automated PR Validator using Graph-Sitter
This script validates PR changes to ensure:
- Functions/classes are properly implemented
- Parameters are correctly defined and used
- Dependencies are valid and resolvable
- No broken references or missing imports
- Code structure integrity is maintained
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Graph-sitter imports
try:
    from graph_sitter import Codebase
    from graph_sitter.core.class_definition import Class
    from graph_sitter.core.external_module import ExternalModule
    from graph_sitter.core.file import SourceFile
    from graph_sitter.core.function import Function
    from graph_sitter.core.import_resolution import Import
    from graph_sitter.core.symbol import Symbol
    from graph_sitter.enums import EdgeType, SymbolType

    GRAPH_SITTER_AVAILABLE = True
except ImportError:
    print("❌ Graph-sitter not available. Install with: pip install graph-sitter")
    GRAPH_SITTER_AVAILABLE = False
# Codegen imports
try:
    from codegen.agents.agent import Agent

    CODEGEN_AVAILABLE = True
except ImportError:
    print("⚠️  Codegen not available. Install with: pip install codegen")
    CODEGEN_AVAILABLE = False


class ValidationSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    severity: ValidationSeverity
    category: str
    message: str
    file_path: str
    line_number: Optional[int] = None
    symbol_name: Optional[str] = None
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    is_valid: bool
    issues: List[ValidationIssue]
    summary: Dict[str, int]

    def add_issue(self, issue: ValidationIssue):
        self.issues.append(issue)
        if issue.severity == ValidationSeverity.ERROR:
            self.is_valid = False

        # Update summary
        key = f"{issue.severity.value}s"
        self.summary[key] = self.summary.get(key, 0) + 1


class PRValidator:
    """Automated PR validator using graph-sitter analysis"""

    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.codebase = None
        self.changed_files = []
        self.validation_result = ValidationResult(is_valid=True, issues=[], summary={})

    def validate_pr(self, pr_files: List[str] = None) -> ValidationResult:
        """Main validation entry point"""
        print("🔍 Starting PR validation...")

        if not GRAPH_SITTER_AVAILABLE:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="setup",
                    message="Graph-sitter not available",
                    file_path="system",
                )
            )
            return self.validation_result

        try:
            # Initialize codebase
            print("📊 Initializing codebase analysis...")
            self.codebase = Codebase(str(self.repo_path))

            # Get changed files
            self.changed_files = pr_files or self._get_changed_files()
            print(f"📝 Validating {len(self.changed_files)} changed files...")

            # Run validation checks
            self._validate_file_structure()
            self._validate_function_implementations()
            self._validate_class_implementations()
            self._validate_imports_and_dependencies()
            self._validate_parameter_usage()
            self._validate_symbol_references()
            self._validate_architectural_integrity()

            print(
                f"✅ Validation complete: {len(self.validation_result.issues)} issues found"
            )
            return self.validation_result

        except Exception as e:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="system",
                    message=f"Validation failed: {e}",
                    file_path="system",
                )
            )
            return self.validation_result

    def _get_changed_files(self) -> List[str]:
        """Get list of files changed in the PR"""
        try:
            result = subprocess.run(
                ["git", "diff", "--name-only", "HEAD~1..HEAD"],
                capture_output=True,
                text=True,
                cwd=self.repo_path,
            )
            if result.returncode == 0:
                files = [f for f in result.stdout.strip().split("\n") if f.strip()]
                return files
        except Exception as e:
            print(f"⚠️  Could not detect changed files: {e}")
        return []

    def _validate_file_structure(self):
        """Validate file structure and syntax"""
        print("📁 Validating file structure...")

        for file_path in self.changed_files:
            full_path = self.repo_path / file_path

            # Check if file exists
            if not full_path.exists():
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="file_structure",
                        message="File does not exist",
                        file_path=file_path,
                    )
                )
                continue

            # Check if file is parseable
            try:
                if file_path.endswith(".py"):
                    with open(full_path, "r") as f:
                        compile(f.read(), file_path, "exec")
                elif file_path.endswith((".ts", ".tsx", ".js", ".jsx")):
                    # Basic syntax check for TypeScript/JavaScript
                    pass  # Could add more sophisticated checks
            except SyntaxError as e:
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="syntax",
                        message=f"Syntax error: {e.msg}",
                        file_path=file_path,
                        line_number=e.lineno,
                    )
                )

    def _validate_function_implementations(self):
        """Validate function implementations in changed files"""
        print("🔧 Validating function implementations...")

        for file_path in self.changed_files:
            # Find the file in codebase
            source_file = self._find_source_file(file_path)
            if not source_file:
                continue

            for function in source_file.functions:
                self._validate_function(function, file_path)

    def _validate_function(self, function: Function, file_path: str):
        """Validate a specific function"""
        # Check if function has implementation
        if not hasattr(function, "code_block") or not function.code_block:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="function_implementation",
                    message=f"Function '{function.name}' has no implementation",
                    file_path=file_path,
                    symbol_name=function.name,
                    suggestion="Add function body or mark as abstract",
                )
            )
            return

        # Check parameters
        if hasattr(function, "parameters"):
            for param in function.parameters:
                self._validate_parameter(param, function, file_path)

        # Check return statements
        if hasattr(function, "return_statements"):
            self._validate_return_statements(function, file_path)

        # Check function calls
        if hasattr(function, "function_calls"):
            for call in function.function_calls:
                self._validate_function_call(call, function, file_path)

        # Check if function is used (detect potential dead code)
        if hasattr(function, "call_sites") and len(function.call_sites) == 0:
            # Only warn for non-public functions
            if not function.name.startswith("_") and function.name not in [
                "main",
                "__init__",
            ]:
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="unused_code",
                        message=f"Function '{function.name}' appears to be unused",
                        file_path=file_path,
                        symbol_name=function.name,
                        suggestion="Consider removing if truly unused or add tests",
                    )
                )

    def _validate_parameter(self, param, function: Function, file_path: str):
        """Validate function parameter"""
        # Check if parameter is used in function body
        if hasattr(function, "code_block") and hasattr(param, "name"):
            param_name = param.name
            function_source = (
                function.code_block.source
                if hasattr(function.code_block, "source")
                else ""
            )

            if param_name not in function_source:
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="unused_parameter",
                        message=f"Parameter '{param_name}' in function '{function.name}' is not used",
                        file_path=file_path,
                        symbol_name=function.name,
                        suggestion=f"Remove unused parameter or prefix with underscore: _{param_name}",
                    )
                )

    def _validate_return_statements(self, function: Function, file_path: str):
        """Validate function return statements"""
        if not hasattr(function, "return_statements"):
            return

        return_count = len(function.return_statements)

        # Check for functions that should return something but don't
        if return_count == 0 and function.name not in ["__init__", "setUp", "tearDown"]:
            # Check if function name suggests it should return something
            if any(
                keyword in function.name.lower()
                for keyword in ["get", "find", "calculate", "compute", "generate"]
            ):
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="missing_return",
                        message=f"Function '{function.name}' suggests it should return a value but has no return statements",
                        file_path=file_path,
                        symbol_name=function.name,
                        suggestion="Add return statement or rename function to indicate it's a procedure",
                    )
                )

    def _validate_function_call(self, call, function: Function, file_path: str):
        """Validate function calls within a function"""
        if not hasattr(call, "name"):
            return

        call_name = call.name

        # Check if called function exists in codebase
        called_function = None
        for func in self.codebase.functions:
            if func.name == call_name:
                called_function = func
                break

        if not called_function:
            # Check if it's a built-in or imported function
            if not self._is_builtin_or_imported(call_name, file_path):
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="undefined_function",
                        message=f"Function '{call_name}' called in '{function.name}' is not defined",
                        file_path=file_path,
                        symbol_name=function.name,
                        suggestion=f"Define function '{call_name}' or add proper import",
                    )
                )

    def _validate_class_implementations(self):
        """Validate class implementations in changed files"""
        print("🏗️ Validating class implementations...")

        for file_path in self.changed_files:
            source_file = self._find_source_file(file_path)
            if not source_file:
                continue

            for cls in source_file.classes:
                self._validate_class(cls, file_path)

    def _validate_class(self, cls: Class, file_path: str):
        """Validate a specific class"""
        # Check if class has methods
        if hasattr(cls, "methods") and len(cls.methods) == 0:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="empty_class",
                    message=f"Class '{cls.name}' has no methods",
                    file_path=file_path,
                    symbol_name=cls.name,
                    suggestion="Add methods or consider using a dataclass/namedtuple",
                )
            )

        # Check parent classes
        if hasattr(cls, "parent_class_names"):
            for parent_name in cls.parent_class_names:
                if not self._class_exists(parent_name):
                    self.validation_result.add_issue(
                        ValidationIssue(
                            severity=ValidationSeverity.ERROR,
                            category="undefined_parent_class",
                            message=f"Parent class '{parent_name}' for class '{cls.name}' is not defined",
                            file_path=file_path,
                            symbol_name=cls.name,
                            suggestion=f"Define class '{parent_name}' or add proper import",
                        )
                    )

        # Validate methods
        if hasattr(cls, "methods"):
            for method in cls.methods:
                self._validate_function(method, file_path)

        # Check if class is used
        if hasattr(cls, "symbol_usages") and len(cls.symbol_usages) == 0:
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="unused_class",
                    message=f"Class '{cls.name}' appears to be unused",
                    file_path=file_path,
                    symbol_name=cls.name,
                    suggestion="Consider removing if truly unused or add usage examples",
                )
            )

    def _validate_imports_and_dependencies(self):
        """Validate imports and dependencies"""
        print("📦 Validating imports and dependencies...")

        for file_path in self.changed_files:
            source_file = self._find_source_file(file_path)
            if not source_file:
                continue

            if hasattr(source_file, "imports"):
                for import_stmt in source_file.imports:
                    self._validate_import(import_stmt, file_path)

    def _validate_import(self, import_stmt: Import, file_path: str):
        """Validate a specific import"""
        if not hasattr(import_stmt, "module_name"):
            return

        module_name = import_stmt.module_name

        # Check if imported module exists
        if not self._module_exists(module_name):
            self.validation_result.add_issue(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="missing_import",
                    message=f"Imported module '{module_name}' cannot be resolved",
                    file_path=file_path,
                    suggestion=f"Install package containing '{module_name}' or fix import path",
                )
            )

        # Check if imported symbols are used
        if hasattr(import_stmt, "imported_symbol") and import_stmt.imported_symbol:
            symbol = import_stmt.imported_symbol
            if hasattr(symbol, "symbol_usages") and len(symbol.symbol_usages) == 0:
                symbol_name = getattr(symbol, "name", "unknown")
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="unused_import",
                        message=f"Imported symbol '{symbol_name}' from '{module_name}' is not used",
                        file_path=file_path,
                        suggestion=f"Remove unused import: {symbol_name}",
                    )
                )

    def _validate_parameter_usage(self):
        """Validate parameter usage across the codebase"""
        print("🔧 Validating parameter usage...")

        for file_path in self.changed_files:
            source_file = self._find_source_file(file_path)
            if not source_file:
                continue

            # Check all functions in the file
            for function in source_file.functions:
                if hasattr(function, "function_calls"):
                    for call in function.function_calls:
                        self._validate_call_parameters(call, function, file_path)

    def _validate_call_parameters(
        self, call, caller_function: Function, file_path: str
    ):
        """Validate parameters in function calls"""
        if not hasattr(call, "name") or not hasattr(call, "args"):
            return

        call_name = call.name
        call_args = call.args

        # Find the called function
        called_function = None
        for func in self.codebase.functions:
            if func.name == call_name:
                called_function = func
                break

        if called_function and hasattr(called_function, "parameters"):
            expected_params = len(called_function.parameters)
            actual_args = len(call_args)

            # Simple parameter count check (could be enhanced for *args, **kwargs)
            if actual_args != expected_params:
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="parameter_mismatch",
                        message=f"Function '{call_name}' called with {actual_args} arguments but expects {expected_params}",
                        file_path=file_path,
                        symbol_name=caller_function.name,
                        suggestion=f"Check function signature for '{call_name}'",
                    )
                )

    def _validate_symbol_references(self):
        """Validate symbol references and usages"""
        print("🔗 Validating symbol references...")

        for file_path in self.changed_files:
            source_file = self._find_source_file(file_path)
            if not source_file:
                continue

            if hasattr(source_file, "symbols"):
                for symbol in source_file.symbols:
                    self._validate_symbol_reference(symbol, file_path)

    def _validate_symbol_reference(self, symbol: Symbol, file_path: str):
        """Validate a specific symbol reference"""
        if not hasattr(symbol, "name"):
            return

        symbol_name = symbol.name

        # Check if symbol is defined
        if hasattr(symbol, "symbol_usages"):
            usages = symbol.symbol_usages
            if len(usages) == 0 and not symbol_name.startswith("_"):
                # Symbol is defined but never used
                self.validation_result.add_issue(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="unused_symbol",
                        message=f"Symbol '{symbol_name}' is defined but never used",
                        file_path=file_path,
                        symbol_name=symbol_name,
                        suggestion="Remove unused symbol or add usage",
                    )
                )

    def _validate_architectural_integrity(self):
        """Validate architectural integrity and patterns"""
        print("🏛️ Validating architectural integrity...")

        # Check for circular dependencies
        self._check_circular_dependencies()

        # Check for architectural violations
        self._check_architectural_patterns()

    def _check_circular_dependencies(self):
        """Check for circular import dependencies"""
        if not hasattr(self.codebase, "ctx") or not hasattr(self.codebase.ctx, "edges"):
            return

        # Build dependency graph
        import_edges = [
            edge
            for edge in self.codebase.ctx.edges
            if edge[2].type == EdgeType.IMPORT_SYMBOL_RESOLUTION
        ]

        # Simple cycle detection (could be enhanced)
        file_dependencies = {}
        for edge in import_edges:
            source_file = self._get_file_from_node(edge[0])
            target_file = self._get_file_from_node(edge[1])

            if source_file and target_file and source_file != target_file:
                if source_file not in file_dependencies:
                    file_dependencies[source_file] = set()
                file_dependencies[source_file].add(target_file)

        # Check for cycles
        for file_path in self.changed_files:
            if file_path in file_dependencies:
                if self._has_circular_dependency(file_path, file_dependencies, set()):
                    self.validation_result.add_issue(
                        ValidationIssue(
                            severity=ValidationSeverity.ERROR,
                            category="circular_dependency",
                            message=f"Circular dependency detected involving '{file_path}'",
                            file_path=file_path,
                            suggestion="Refactor to remove circular imports",
                        )
                    )

    def _check_architectural_patterns(self):
        """Check for architectural pattern violations"""
        # This could be customized based on project-specific patterns
        pass

    # Helper methods
    def _find_source_file(self, file_path: str) -> Optional[SourceFile]:
        """Find source file in codebase"""
        for file in self.codebase.files:
            if hasattr(file, "path") and str(file.path).endswith(file_path):
                return file
        return None

    def _is_builtin_or_imported(self, function_name: str, file_path: str) -> bool:
        """Check if function is builtin or imported"""
        # Python builtins
        python_builtins = {
            "print",
            "len",
            "str",
            "int",
            "float",
            "list",
            "dict",
            "set",
            "tuple",
            "range",
            "enumerate",
            "zip",
            "map",
            "filter",
            "sorted",
            "max",
            "min",
            "sum",
            "any",
            "all",
            "isinstance",
            "hasattr",
            "getattr",
            "setattr",
        }

        if function_name in python_builtins:
            return True

        # Check if imported
        source_file = self._find_source_file(file_path)
        if source_file and hasattr(source_file, "imports"):
            for import_stmt in source_file.imports:
                if hasattr(import_stmt, "imported_symbol"):
                    symbol = import_stmt.imported_symbol
                    if hasattr(symbol, "name") and symbol.name == function_name:
                        return True

        return False

    def _class_exists(self, class_name: str) -> bool:
        """Check if class exists in codebase"""
        for cls in self.codebase.classes:
            if cls.name == class_name:
                return True
        return False

    def _module_exists(self, module_name: str) -> bool:
        """Check if module exists"""
        # Check internal modules
        for file in self.codebase.files:
            if hasattr(file, "path"):
                file_path = str(file.path)
                if module_name.replace(".", "/") in file_path:
                    return True

        # Check external modules
        for ext_module in self.codebase.external_modules:
            if hasattr(ext_module, "name") and ext_module.name == module_name:
                return True

        # Try importing (for external packages)
        try:
            __import__(module_name)
            return True
        except ImportError:
            return False

    def _get_file_from_node(self, node) -> Optional[str]:
        """Get file path from graph node"""
        # This would need to be implemented based on graph-sitter's node structure
        return None

    def _has_circular_dependency(
        self, file_path: str, dependencies: Dict, visited: Set
    ) -> bool:
        """Check for circular dependencies using DFS"""
        if file_path in visited:
            return True

        visited.add(file_path)

        if file_path in dependencies:
            for dep in dependencies[file_path]:
                if self._has_circular_dependency(dep, dependencies, visited):
                    return True

        visited.remove(file_path)
        return False


def generate_validation_report(result: ValidationResult) -> str:
    """Generate a comprehensive validation report"""
    report = f"""
# 🔍 PR Validation Report
## Summary
- **Status**: {"✅ PASSED" if result.is_valid else "❌ FAILED"}
- **Total Issues**: {len(result.issues)}
- **Errors**: {result.summary.get("errors", 0)}
- **Warnings**: {result.summary.get("warnings", 0)}
- **Info**: {result.summary.get("infos", 0)}
## Issues by Category
"""

    # Group issues by category
    categories = {}
    for issue in result.issues:
        if issue.category not in categories:
            categories[issue.category] = []
        categories[issue.category].append(issue)

    for category, issues in categories.items():
        report += f"\n### {category.replace('_', ' ').title()}\n"
        for issue in issues:
            severity_icon = {
                ValidationSeverity.ERROR: "❌",
                ValidationSeverity.WARNING: "⚠️",
                ValidationSeverity.INFO: "ℹ️",
            }[issue.severity]

            report += f"- {severity_icon} **{issue.file_path}**"
            if issue.line_number:
                report += f":{issue.line_number}"
            if issue.symbol_name:
                report += f" ({issue.symbol_name})"
            report += f": {issue.message}\n"

            if issue.suggestion:
                report += f"  💡 *Suggestion: {issue.suggestion}*\n"

    return report


def main():
    """Main validation function for CI/CD"""
    print("🚀 Automated PR Validator")
    print("=" * 50)

    # Get environment variables
    repo_path = os.getenv("GITHUB_WORKSPACE", ".")
    pr_number = os.getenv("GITHUB_PR_NUMBER")

    # Initialize validator
    validator = PRValidator(repo_path)

    # Run validation
    result = validator.validate_pr()

    # Generate report
    report = generate_validation_report(result)
    print(report)

    # Save report for CI/CD
    with open("pr_validation_report.md", "w") as f:
        f.write(report)

    # Save JSON for programmatic access
    with open("pr_validation_result.json", "w") as f:
        json.dump(
            {
                "is_valid": result.is_valid,
                "summary": result.summary,
                "issues": [asdict(issue) for issue in result.issues],
            },
            f,
            indent=2,
            default=str,
        )

    # Exit with appropriate code
    if result.is_valid:
        print("\n✅ PR validation passed!")
        sys.exit(0)
    else:
        print(
            f"\n❌ PR validation failed with {result.summary.get('errors', 0)} errors"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
