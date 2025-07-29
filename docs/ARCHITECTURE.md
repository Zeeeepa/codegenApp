# Backend Architecture - Strands-Agents Workflow Orchestration

## 🏗️ **Proper Backend Structure**

```
backend/
├── app/                          # Main application package
│   ├── api/                      # API layer - HTTP endpoints
│   │   ├── v1/                   # API version 1
│   │   │   ├── routes/           # Route modules
│   │   │   │   ├── codegen.py    # Codegen API endpoints
│   │   │   │   ├── workflow.py   # Workflow orchestration endpoints
│   │   │   │   ├── sandbox.py    # Grainchain sandbox endpoints
│   │   │   │   ├── analysis.py   # Graph-sitter analysis endpoints
│   │   │   │   └── evaluation.py # Web-eval-agent endpoints
│   │   │   ├── dependencies.py   # FastAPI dependencies
│   │   │   └── router.py         # Main API router
│   │   └── middleware.py         # Custom middleware
│   ├── core/                     # Core business logic
│   │   ├── workflow/             # Workflow orchestration engine
│   │   │   ├── engine.py         # Core workflow execution engine
│   │   │   ├── executor.py       # Step execution logic
│   │   │   ├── scheduler.py      # Workflow scheduling
│   │   │   └── templates/        # Workflow templates
│   │   │       ├── ci_cd.py      # CI/CD workflow templates
│   │   │       ├── code_review.py # Code review workflows
│   │   │       └── deployment.py # Deployment workflows
│   │   └── orchestration/        # Service orchestration
│   │       ├── coordinator.py    # Service coordination logic
│   │       ├── state_manager.py  # Workflow state management
│   │       └── event_handler.py  # Event handling
│   ├── services/                 # Service layer
│   │   ├── adapters/             # External service adapters
│   │   │   ├── codegen_adapter.py    # Codegen SDK adapter
│   │   │   ├── grainchain_adapter.py # Grainchain adapter
│   │   │   ├── graph_sitter_adapter.py # Graph-sitter adapter
│   │   │   └── web_eval_adapter.py   # Web-eval-agent adapter
│   │   ├── external/             # External service clients
│   │   │   ├── github_client.py  # GitHub API client
│   │   │   ├── docker_client.py  # Docker API client
│   │   │   └── browser_client.py # Browser automation client
│   │   ├── workflow_service.py   # Workflow business logic
│   │   ├── codegen_service.py    # Codegen business logic
│   │   ├── sandbox_service.py    # Sandbox management logic
│   │   ├── analysis_service.py   # Code analysis logic
│   │   └── evaluation_service.py # Web evaluation logic
│   ├── models/                   # Data models
│   │   ├── api/                  # API request/response models
│   │   │   ├── workflow.py       # Workflow API models
│   │   │   ├── codegen.py        # Codegen API models
│   │   │   ├── sandbox.py        # Sandbox API models
│   │   │   ├── analysis.py       # Analysis API models
│   │   │   └── evaluation.py     # Evaluation API models
│   │   ├── domain/               # Domain/business models
│   │   │   ├── workflow.py       # Workflow domain models
│   │   │   ├── execution.py      # Execution domain models
│   │   │   └── service.py        # Service domain models
│   │   └── database.py           # Database models (if needed)
│   ├── config/                   # Configuration
│   │   ├── settings.py           # Application settings
│   │   ├── logging.py            # Logging configuration
│   │   └── database.py           # Database configuration
│   ├── utils/                    # Utilities
│   │   ├── auth.py               # Authentication utilities
│   │   ├── validation.py         # Validation utilities
│   │   ├── serialization.py      # Serialization utilities
│   │   └── exceptions.py         # Custom exceptions
│   ├── db/                       # Database related
│   │   ├── migrations/           # Database migrations
│   │   ├── repositories/         # Data access layer
│   │   └── session.py            # Database session management
│   └── main.py                   # FastAPI application factory
├── tests/                        # Test suite
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
├── scripts/                      # Utility scripts
│   ├── setup.py                  # Setup script
│   ├── migrate.py                # Database migration script
│   └── seed.py                   # Data seeding script
├── docker/                       # Docker configuration
│   ├── Dockerfile                # Main Dockerfile
│   ├── docker-compose.yml        # Development compose
│   └── docker-compose.prod.yml   # Production compose
├── requirements/                 # Requirements files
│   ├── base.txt                  # Base requirements
│   ├── dev.txt                   # Development requirements
│   └── prod.txt                  # Production requirements
├── .env.example                  # Environment variables example
├── alembic.ini                   # Database migration config
└── pyproject.toml                # Project configuration
```

## 🎯 **Architecture Principles**

### 1. **Separation of Concerns**
- **API Layer**: HTTP endpoints, request/response handling
- **Core Layer**: Business logic, workflow orchestration
- **Service Layer**: External integrations, adapters
- **Model Layer**: Data structures, validation

### 2. **Dependency Direction**
```
API → Services → Core → Models
```
- API depends on Services
- Services depend on Core
- Core depends on Models
- No reverse dependencies

### 3. **Service Adapter Pattern**
Each external service (Codegen, grainchain, etc.) has:
- **Adapter**: Protocol/interface definition
- **Client**: Actual implementation
- **Service**: Business logic wrapper

### 4. **Workflow Engine Architecture**
```
Workflow Request → Engine → Executor → Service Adapters → External APIs
                     ↓
                State Manager → Database/Cache
```

## 🔧 **Key Components**

### **Workflow Engine** (`app/core/workflow/`)
- **engine.py**: Core orchestration logic
- **executor.py**: Step execution with retry/timeout
- **scheduler.py**: Workflow scheduling and queuing
- **templates/**: Pre-built workflow definitions

### **Service Adapters** (`app/services/adapters/`)
- **codegen_adapter.py**: Codegen SDK integration
- **grainchain_adapter.py**: Sandbox management
- **graph_sitter_adapter.py**: Code analysis
- **web_eval_adapter.py**: Web evaluation

### **API Routes** (`app/api/v1/routes/`)
- **workflow.py**: Workflow CRUD and execution
- **codegen.py**: Agent run management
- **sandbox.py**: Sandbox operations
- **analysis.py**: Code analysis endpoints
- **evaluation.py**: Web evaluation endpoints

## 🚀 **Benefits of This Structure**

1. **Scalability**: Easy to add new services/workflows
2. **Testability**: Clear boundaries for unit/integration tests
3. **Maintainability**: Logical organization of code
4. **Flexibility**: Can easily swap implementations
5. **FastAPI Best Practices**: Follows established patterns

## 🔄 **Data Flow**

1. **Request**: API receives HTTP request
2. **Validation**: Pydantic models validate input
3. **Service**: Business logic processes request
4. **Orchestration**: Workflow engine coordinates steps
5. **Adapters**: External services are called
6. **Response**: Results are returned to client

## 🛡️ **Error Handling Strategy**

- **API Level**: HTTP status codes, error responses
- **Service Level**: Business logic exceptions
- **Adapter Level**: External service error mapping
- **Core Level**: Workflow execution errors

This architecture provides a solid foundation for the strands-agents workflow orchestration system while following Python/FastAPI best practices.
