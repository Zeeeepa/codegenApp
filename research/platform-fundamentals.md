# Platform Fundamentals Research

## Overview
This document captures the core architecture, design philosophy, and primary use cases for each workflow orchestration platform.

## 1. Prefect

### Core Architecture
- **Python-native orchestration engine** that turns Python functions into production-grade data pipelines
- **Dynamic DAG engine** that adapts to change, avoiding rigid DAG structures
- **Minimal friction approach** - add decorators to existing Python code to make it reliable
- **State-based execution** with automatic state tracking and recovery

### Design Philosophy
- **"Pythonic"** - Write workflows in native Python with no DSLs, YAML, or special syntax
- **Code-first approach** - Use existing IDE, debugger, and testing tools
- **Flexibility over rigidity** - Workflows respond to data changes rather than forcing rigid structures
- **Developer experience focused** - Minimal configuration, maximum productivity

### Primary Use Cases
- **Data pipeline orchestration** - ETL/ELT workflows
- **Machine learning pipelines** - Model training and deployment workflows
- **Business process automation** - Python-based business logic automation
- **Data engineering workflows** - Transform existing Python scripts into reliable pipelines

### Target Audience
- **Data engineers** and **data scientists** working primarily in Python
- **Teams migrating from Apache Airflow** seeking better developer experience
- **Organizations with existing Python codebases** wanting to add orchestration

### Programming Language Support
- **Primary**: Python (native support with full ecosystem integration)
- **Secondary**: Can execute other languages via Python subprocess calls or containers

### Deployment Models
- **Local development** - Start flows locally for easy development
- **Cloud deployment** - Deploy anywhere Python can run
- **Prefect Cloud** - Managed service option
- **Self-hosted** - On-premises deployment with Prefect Server

---

## 2. Temporal

### Core Architecture
- **Durable execution platform** that guarantees code runs to completion regardless of failures
- **Event-driven state machine** with automatic state persistence at every step
- **Microservice coordination** - Designed for distributed systems and service orchestration
- **Workflow and Activity separation** - Clear distinction between orchestration logic and business logic

### Design Philosophy
- **"Write code as if failure doesn't exist"** - Platform handles all failure scenarios automatically
- **Durable execution guarantee** - No lost progress, no orphaned processes, no manual recovery
- **Reliability by default** - Automatic handling of intermittent failures and retries
- **Developer productivity** - Focus on business logic, not infrastructure concerns

### Primary Use Cases
- **Microservice orchestration** - Coordinate complex distributed transactions
- **Financial transactions** - Money movement, payment processing with strong consistency
- **Long-running business processes** - Multi-step workflows that span hours/days/weeks
- **Saga pattern implementation** - Distributed transaction management
- **Event-driven architectures** - Complex event processing and state management

### Target Audience
- **Backend engineers** building distributed systems
- **Financial services** requiring strong consistency guarantees
- **Enterprise teams** needing bulletproof reliability
- **Microservice architects** coordinating complex service interactions

### Programming Language Support
- **Multi-language SDKs**: Go, Java, Python, TypeScript, PHP, .NET, Rust
- **Language-agnostic** - Different services can use different languages
- **Native SDK support** - Full-featured SDKs for each supported language

### Deployment Models
- **Temporal Cloud** - Fully managed service
- **Self-hosted** - Deploy Temporal Server on your infrastructure
- **Kubernetes** - Helm charts and operators available
- **Docker** - Container-based deployment options

---

## 3. Kestra

### Core Architecture
- **Event-driven declarative orchestration** platform
- **YAML-based workflow definition** with Infrastructure as Code principles
- **Language-agnostic execution** - Run any language or tool via plugins
- **Plugin ecosystem** - Hundreds of built-in plugins for integrations

### Design Philosophy
- **"Everything as Code and from the UI"** - Workflows as code with Git integration, buildable from UI
- **Declarative approach** - Simple YAML configuration over complex programming
- **Event-driven and scheduled** - Support both real-time events and scheduled workflows
- **Accessibility** - Simple syntax allows broader organizational collaboration

### Primary Use Cases
- **Data orchestration** - ETL/ELT pipelines across multiple systems
- **Event-driven automation** - React to real-time events and triggers
- **Multi-language workflows** - Coordinate tasks across different programming languages
- **Infrastructure automation** - DevOps and infrastructure management workflows
- **Business process automation** - Cross-system business workflows

### Target Audience
- **Data engineers** seeking language flexibility
- **DevOps teams** wanting Infrastructure as Code for workflows
- **Organizations with polyglot environments** (multiple programming languages)
- **Teams wanting both technical and non-technical collaboration**

### Programming Language Support
- **Language-agnostic** - Execute any language through plugins
- **Built-in support**: Python, R, Node.js, Shell, SQL, and more
- **Container support** - Run any Docker container as a task
- **Plugin architecture** - Extensible through custom plugins

### Deployment Models
- **Kestra Cloud** - Managed service option
- **Self-hosted** - Open-source deployment
- **Docker** - Container-based deployment
- **Kubernetes** - Cloud-native deployment options

---

## 4. Hatchet

### Core Architecture
- **Distributed, fault-tolerant task queue** system
- **Ultra-low latency scheduling** with high throughput capabilities
- **Worker-based execution** - You run workers, Hatchet manages orchestration
- **Built-in concurrency controls** - FIFO, LIFO, Round Robin, Priority queues

### Design Philosophy
- **"You run your workers, we manage the rest"** - Orchestrator pattern with user-controlled workers
- **Scaling problems solved** - Built-in solutions for concurrency, fairness, rate limiting
- **Resilience by design** - Customizable retry policies and integrated error handling
- **Minimal configuration** - Distribute functions with minimal infrastructure setup

### Primary Use Cases
- **Background task processing** - Async job processing at scale
- **API request handling** - Offload heavy processing from web requests
- **Event processing** - High-throughput event stream processing
- **Distributed computing** - Coordinate work across multiple workers
- **Rate-limited operations** - Manage API calls and resource-constrained operations

### Target Audience
- **Backend developers** building scalable web applications
- **Teams replacing legacy queue systems** (Redis, RabbitMQ, etc.)
- **High-throughput applications** needing reliable task distribution
- **Developers wanting simple alternatives** to complex pub/sub systems

### Programming Language Support
- **Multi-language SDKs** - Python, TypeScript, Go (with more planned)
- **Worker flexibility** - Workers can be implemented in supported languages
- **API-driven** - REST API allows integration with any language

### Deployment Models
- **Hatchet Cloud** - Managed service option
- **Self-hosted** - Deploy Hatchet server on your infrastructure
- **Hybrid** - Managed orchestration with self-hosted workers
- **Docker** - Container-based deployment

---

## 5. Windmill

### Core Architecture
- **Developer platform** combining workflow engine with UI builder
- **Multi-language execution runtime** - Scalable, low-latency function execution
- **Auto-generated UIs** - Scripts automatically become shareable web interfaces
- **Low-code + code hybrid** - Visual builders combined with full programming capability

### Design Philosophy
- **"Turn scripts into webhooks, workflows and UIs"** - Transform code into full applications
- **Developer + non-technical collaboration** - Bridge technical and business users
- **Speed and maintainability** - Fast development with observable, debuggable results
- **Comprehensive internal tools** - Single platform for APIs, workflows, and UIs

### Primary Use Cases
- **Internal tool development** - Build admin panels, dashboards, automation tools
- **Script automation** - Turn one-off scripts into reliable, shareable tools
- **Workflow automation** - Business process automation with UI components
- **API development** - Create endpoints and webhooks from scripts
- **Data applications** - Build data-centric dashboards and tools

### Target Audience
- **Full-stack developers** building internal tools
- **Small technical teams** needing to cover large surface areas
- **Organizations wanting alternatives** to Retool, Superblocks, n8n
- **Teams needing rapid internal tool development**

### Programming Language Support
- **Multi-language**: TypeScript, Python, Go, PHP, Bash, C#, SQL, Rust
- **Docker support** - Run any Docker image as a script
- **Framework integration** - React and other JS frameworks for custom UIs
- **GraphQL support** - Built-in GraphQL execution capabilities

### Deployment Models
- **Windmill Cloud** - Managed service
- **Self-hosted** - Fully open-source (AGPLv3) deployment
- **Docker** - Container-based deployment
- **Kubernetes** - Cloud-native deployment options

---

## Key Differentiators Summary

| Platform | Primary Focus | Architecture | Language Support | Key Strength |
|----------|---------------|--------------|------------------|--------------|
| **Prefect** | Data Pipelines | Python-native DAG engine | Python-first | Developer experience for data teams |
| **Temporal** | Microservice Orchestration | Durable execution state machine | Multi-language SDKs | Bulletproof reliability for distributed systems |
| **Kestra** | Declarative Workflows | Event-driven YAML platform | Language-agnostic plugins | Infrastructure as Code for workflows |
| **Hatchet** | Task Queue | Distributed worker system | Multi-language SDKs | High-performance background processing |
| **Windmill** | Internal Tools | Script-to-app platform | Multi-language runtime | Rapid internal tool development |

## Next Steps
This fundamental research provides the foundation for deeper technical architecture analysis, developer experience evaluation, and use case mapping in subsequent research phases.

