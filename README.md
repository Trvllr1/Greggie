# Greggie™ — The Live Commerce OS

> Amazon meets TikTok in Manhattan. Functionality exuding luxury at a high-end mall.

## Architecture

```
greggie/
├── packages/
│   ├── core/       # Shared types, API client, constants
│   ├── web/        # Vite + React + Tailwind + Framer Motion
│   └── mobile/     # Expo + React Native (future)
├── backend/        # Go (Fiber) API server
├── shared/
│   ├── migrations/ # PostgreSQL schema + seed data
│   └── api-contracts/
├── infra/          # Docker, deployment configs
└── docker-compose.yml
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start backend + Postgres + Redis
docker compose up -d

# Run DB migrations
docker compose exec postgres psql -U greggie -d greggie -f /migrations/001_core_schema.sql

# Start web client
pnpm dev:web
```

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion
- **Backend**: Go (Fiber v2), PostgreSQL 16, Redis 7
- **Payments**: Stripe Connect (Phase 2+)
- **Real-time**: WebSockets + Redis pub/sub (Phase 3+)
- **Deployment**: Oracle Cloud Free Tier + Vercel
