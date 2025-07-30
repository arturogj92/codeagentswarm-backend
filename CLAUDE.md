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