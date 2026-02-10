# TestTrack Pro - Full-Stack Monorepo

TestTrack Pro is a full-stack software testing management platform.
Its goal is to manage the complete QA lifecycle in one place - from writing test cases to executing them, reporting bugs, tracking fixes, and generating analytics.
Think of it as a mini version of tools like TestRail + Jira.

## 🧭 Product Overview

- Centralize test case authoring, organization, and review.
- Execute test runs with status tracking and real-time discussion.
- Report defects, assign owners, and track resolution progress.
- Monitor QA health with dashboards and analytics.

## 📁 Project Structure

```
testtrack-pro/
├── apps/
│   ├── api/                    # Fastify backend server
│   │   ├── src/
│   │   │   ├── server.js       # Main server entry
│   │   │   └── routes/
│   │   │       └── auth.js     # Authentication routes
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   ├── .env                # Environment variables
│   │   └── package.json
│   │
│   └── web/                    # React + Vite frontend
│       ├── src/
│       │   ├── main.jsx        # Entry point
│       │   ├── App.jsx         # Root component
│       │   ├── pages/          # Page components
│       │   ├── components/     # Reusable components
│       │   └── styles/         # Global styles
│       ├── index.html          # HTML template
│       ├── vite.config.js      # Vite configuration
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types and utilities
│       ├── index.ts            # TypeScript types
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/                    # Utility scripts
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
├── package.json                # Root package file
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **pnpm**: v8 or higher ([install pnpm](https://pnpm.io/installation))

### Installation

1. Install dependencies across all workspaces:
```bash
pnpm install
```

2. Set up environment variables:
   - API: `apps/api/.env` (already configured with SQLite)
   - Web: `apps/web/.env` (optional, uses defaults)

3. Initialize the database:
```bash
cd apps/api
npx prisma migrate dev --name init
```

For NeonDB setup instructions, see [NEONDB_SETUP.md](./NEONDB_SETUP.md)

### Running Locally

Start all applications in development mode:
```bash
pnpm dev
```

This will start:
- **Frontend**: http://localhost:5173 (React + Vite)
- **Backend**: http://localhost:3001 (Fastify API)

### Individual App Commands

**Frontend (apps/web):**
```bash
pnpm --filter web dev      # Development
pnpm --filter web build    # Production build
pnpm --filter web preview  # Preview build
```

**Backend (apps/api):**
```bash
pnpm --filter api dev      # Development with hot reload
pnpm --filter api start    # Production
```

## 📦 Tech Stack

### Frontend (apps/web)
- **React** 18 - UI library
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS framework

### Backend (apps/api)
- **Fastify** - Fast and low overhead web framework
- **Prisma** - Type-safe ORM
- **PostgreSQL (NeonDB)** - Serverless PostgreSQL database
- **JWT** - Secure authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin request handling

### Testing & QA
- **ESLint** - Code linting

### Build & Deployment
- **Turborepo** - Monorepo task orchestration
- **pnpm** - Package manager with workspaces support

## 🔐 Authentication Flow

1. **Sign Up** (`POST /api/auth/signup`)
   - Accepts email and password
   - Validates input
   - Hashes password with bcryptjs
   - Creates user in database
   - Returns JWT token

2. **Login** (`POST /api/auth/login`)
   - Accepts email and password
   - Verifies credentials against database
   - Returns JWT token on success

3. **Protected Routes**
   - Dashboard requires valid JWT token
   - Token stored in localStorage
   - Automatic redirect to login if unauthorized

## 📝 API Endpoints

### Authentication

**POST /api/auth/signup**
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "User registered successfully",
  "user": { "id": 1, "email": "user@example.com" },
  "token": "eyJhbGc..."
}
```

**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "user": { "id": 1, "email": "user@example.com" },
  "token": "eyJhbGc..."
}
```

**GET /health**
```json
Response:
{
  "status": "ok"
}
```



## 🔄 Development Workflow

### Adding a New Package

1. Create package in `packages/` or `apps/`
2. Add `package.json` with `"private": true`
3. Run `pnpm install` to link workspaces
4. Import in other packages using workspace protocol: `"@workspace-name": "workspace:*"`

### Database Migrations

```bash
cd apps/api

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

### Building for Production

Build all workspaces:
```bash
pnpm build
```

Build specific workspace:
```bash
pnpm --filter web build
```

## 📚 Scripts Reference

| Command | Description |
|---------|------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm clean` | Clean all artifacts and node_modules |

## 🚢 Deployment

### Frontend Deployment (Vercel, Netlify)
```bash
pnpm --filter web build
# Deploy dist/ folder
```

### Backend Deployment (Railway, Render, Heroku)
```bash
pnpm --filter api build
# Deploy with Node.js runtime
```

## 🔧 Configuration Files

- **turbo.json** - Turborepo task graph configuration
- **pnpm-workspace.yaml** - Workspace definitions
- **vite.config.js** - Frontend build configuration
- **prisma/schema.prisma** - Database schema
- **apps/api/.env** - NeonDB connection string and JWT secret

## 📖 Learning Resources

- [Turborepo Documentation](https://turborepo.org/)
- [React Documentation](https://react.dev/)
- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Playwright Documentation](https://playwright.dev/)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and verify: `pnpm build`
3. Commit with clear messages
4. Push and create a Pull Request

## 📄 License

MIT

## 🆘 Troubleshooting

**pnpm install fails**
- Delete `pnpm-lock.yaml` and try again
- Ensure pnpm is updated: `pnpm add -g pnpm@latest`

**Port already in use**
- Frontend: Change port in `apps/web/vite.config.js`
- Backend: Change port in `apps/api/src/server.js`

**Database errors**
- Reset: `cd apps/api && npx prisma migrate reset`
- For NeonDB issues, see [NEONDB_SETUP.md](./NEONDB_SETUP.md)


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
