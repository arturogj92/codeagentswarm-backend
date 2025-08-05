# CodeAgentSwarm Backend

## 🏗️ Architecture: Hexagonal (Ports & Adapters)

This backend follows **Hexagonal Architecture** principles to ensure clean separation of concerns and maintainability.

### Directory Structure

```
src/
├── domain/               # Core business logic (innermost layer)
│   ├── entities/        # Business entities
│   ├── repositories/    # Repository interfaces
│   └── services/        # Domain services
│
├── application/         # Application layer
│   ├── usecases/       # Business use cases
│   └── ports/          # Port interfaces (input/output)
│
├── infrastructure/      # Infrastructure layer (outermost)
│   ├── repositories/   # Repository implementations (Supabase)
│   ├── services/       # External service adapters
│   └── web/           # Web framework specifics
│       ├── routes/    # Express routes
│       └── middleware/ # Express middleware
│
└── config/             # Configuration files
```

### Architecture Principles

1. **Domain Layer**: Contains pure business logic with no external dependencies
2. **Application Layer**: Orchestrates use cases and defines ports
3. **Infrastructure Layer**: Implements technical details (database, web, external services)

### Key Features

- **Update System**: Serves automatic updates to Electron app via electron-updater
- **Log Collection**: Receives and stores application logs from users
- **Crash Reports**: Handles crash dump uploads and processing
- **Release Management**: Admin endpoints for managing app releases

### Technology Stack

- **Runtime**: Node.js + Express
- **Database & Storage**: Supabase (PostgreSQL + S3-compatible storage)
- **Deployment**: Railway
- **Architecture**: Hexagonal (Ports & Adapters)

### Environment Variables

See `.env.example` for required configuration.

### Deployment

This backend is deployed on Railway and uses Supabase for:
- PostgreSQL database for structured data
- Storage buckets for files (releases, logs, crash dumps)

## Specialized Agents for Development

### 📋 Task Manager Agent
**Usage**: MUST BE USED for all task-related operations
- **Automatically prevents duplicate tasks** by checking existing ones
- Creates tasks before any development work
- Updates plans and tracks implementation
- Manages task lifecycle (pending → in_progress → in_testing → completed)

**Key Features**:
- **Duplicate Detection**: Searches similar tasks across all statuses
- **Auto Terminal Detection**: No need to specify terminal
- **Project Detection**: Reads from CLAUDE.md automatically

**Example invocation**:
```
"Create a task for implementing user authentication"
"List my current tasks"
"Update the plan for the current task"
"Complete this task"
```

### 🏗️ Hexagonal Architecture Developer
**Usage**: When implementing new features or refactoring code
- Automatically follows hexagonal architecture patterns
- Separates domain, application, and infrastructure layers
- **ALWAYS calls test-writer agent after implementation**

**Example invocation**:
```
"Implement a new user authentication feature"
"Refactor the task management to use hexagonal architecture"
```

### 🧪 Test Writer Agent
**Usage**: Automatically invoked after hexagonal-developer, or manually for existing code
- Writes comprehensive tests for all layers
- Follows TDD principles
- Creates unit, integration, and E2E tests

**Manual invocation**:
```
"Write tests for the notification service"
"Add missing tests for the task repository"
```

### 🔄 Development Flow
The recommended flow for new features:
1. **task-manager** → Creates/manages the task
2. **hexagonal-developer** → Implements with clean architecture
3. **test-writer** → Automatically writes tests
4. **code-reviewer** → Reviews the implementation
5. **notion-documenter** → Updates documentation
6. **git-committer** → Creates semantic commit

### 💡 Tips for Better Agent Usage
- Use specific keywords to trigger the right agent:
  - "create task", "list tasks" → task-manager
  - "implement", "create feature" → hexagonal-developer
  - "write tests", "add tests" → test-writer
  - "review code" → code-reviewer
  - "document" → notion-documenter
  - "commit" → git-committer