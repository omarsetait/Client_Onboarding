# TachyHealth Autonomous Client Onboarding System

AI-Powered Lead-to-Subscription Automation Platform

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)

### Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure (PostgreSQL, Redis, MongoDB)
npm run docker:up

# 3. Run database migrations
npm run db:migrate

# 4. Start development servers
npm run dev
```

### Project Structure

```
tachyhealth-onboarding/
├── apps/
│   ├── api/          # NestJS Backend API
│   ├── web/          # React Frontend Dashboard
│   └── worker/       # Background Job Processor
├── packages/
│   ├── shared/       # Shared types & utilities
│   ├── database/     # Prisma schema & migrations
│   └── integrations/ # External API adapters (HubSpot, etc.)
├── docker/           # Docker Compose & Dockerfiles
└── docs/             # API documentation
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific workspace tests
npm run test --workspace=apps/api
```

## 📚 Documentation

- [Implementation Plan](./docs/implementation-plan.md)
- [API Documentation](./docs/api/)
- [Architecture Guide](./docs/architecture.md)

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Material-UI, Redux Toolkit |
| Backend | Node.js 20, NestJS, Prisma |
| Database | PostgreSQL 15, MongoDB, Redis |
| AI | OpenAI GPT-4, LangChain |
| CRM | HubSpot |

---

© 2026 TachyHealth. All rights reserved.
