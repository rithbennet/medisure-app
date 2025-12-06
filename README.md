# Medisure App

Medisure is a full-stack healthcare web application scaffolded from the T3 Stack. It provides the foundation for building a patient/clinic management experience with authentication, APIs, and a modern frontend. This repository contains the app source, Convex function scaffolding, and configuration for local development and deployment.

Live demo: https://medisure-app.vercel.app

Table of contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Environment variables](#environment-variables)
  - [Database setup](#database-setup)
  - [Convex functions (if used)](#convex-functions-if-used)
  - [Running locally](#running-locally)
  - [Build and deploy](#build-and-deploy)
- [Project structure](#project-structure)
- [Authentication](#authentication)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

Features
- User authentication (NextAuth.js or your chosen auth provider)
- Modern React + Next.js frontend
- Type-safe API layer (tRPC)
- Tailwind CSS for styling
- Database layer (Prisma and/or Drizzle — see repo) and migration support
- Convex functions scaffold available in /convex
- Opinionated developer scripts for local dev and deployment

Tech stack
- Next.js (React)
- TypeScript
- tRPC
- NextAuth.js (authentication)
- Tailwind CSS
- Prisma and/or Drizzle (ORM; repository contains references to both—use whichever is configured)
- Convex (serverless functions directory present at `/convex`)
- Vercel (recommended for deployment; project homepage uses Vercel)

Getting started

Prerequisites
- Node.js 18+ (or the version defined in `.nvmrc` if present)
- pnpm, npm, or yarn
- A database (Postgres recommended) if you plan to use Prisma/Drizzle locally
- (Optional) Convex CLI if you intend to deploy Convex functions: `npm i -g convex` or use `npx convex`

Install
```bash
# clone the repository
git clone https://github.com/rithbennet/medisure-app.git
cd medisure-app

# install dependencies (choose one)
pnpm install
# or
npm install
# or
yarn
```

Environment variables
Create a `.env` file from the example and fill in the values required by your environment and providers.

Example `.env.example`:
```env
# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change_me_to_a_strong_secret

# Database (example: Postgres)
DATABASE_URL=postgresql://user:password@localhost:5432/medisure

# OAuth providers (if used)
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret

# Convex (if using convex)
CONVEX_URL=your_convex_deployment_url
```

Database setup

Prisma (if your project uses Prisma)
```bash
# generate client
npx prisma generate

# run migrations (creates local dev migration; adjust name)
npx prisma migrate dev --name init

# open studio (optional)
npx prisma studio
```

Drizzle (if your project uses Drizzle)
- Follow the Drizzle setup steps you normally use (migrations and schema generation vary by project). Example (if configured):
```bash
# run drizzle migrations (example)
npm run drizzle:migrate
```

If the repository uses both ORMs as references, inspect `package.json` and the `prisma/` or `drizzle/` folders to determine which tooling is actually used in this project and pick the appropriate commands.

Convex functions (if used)
This repo contains a `/convex` directory with Convex function scaffolding. To run or deploy Convex functions:

- Install convex CLI locally or use npx:
```bash
npx convex dev       # run convex locally (if configured)
npx convex deploy    # deploy functions to Convex
```

Running locally
```bash
# start local dev server
pnpm dev
# or
npm run dev
# or
yarn dev
```
Open http://localhost:3000 in your browser.

Build and deploy
```bash
# build for production
pnpm build
# or
npm run build

# start production server
pnpm start
# or
npm run start
```
Deployment: Vercel is the recommended platform (project homepage is on Vercel). Connect the repository to Vercel and add the same environment variables in Vercel dashboard. For Convex functions, follow Convex deploy instructions and add any runtime secrets needed.

Project structure (high level)
- /app or /pages - Next.js application entry points
- /src - application source (components, hooks, utils)
- /prisma - Prisma schema + migrations (if present)
- /drizzle - Drizzle schema/migrations (if present)
- /convex - Convex functions and README (serverless functions)
- README.md - this file
- package.json - scripts and dependencies

Authentication
This project is scaffolded to use NextAuth.js (see T3 template). You’ll need to configure a provider (GitHub, Google, Email, etc.) and set NEXTAUTH_SECRET and provider credentials in your .env to enable auth in development and production.

Contributing
Contributions are welcome. A suggested workflow:
1. Fork the repository and create a feature branch.
2. Implement your changes, add tests where appropriate.
3. Run linters and tests locally.
4. Open a pull request describing the change.

Please include clear commit messages and keep PRs focused.

Troubleshooting
- If migration commands fail, confirm DATABASE_URL and DB server are reachable.
- If auth isn’t working, ensure NEXTAUTH_URL and NEXTAUTH_SECRET are set and provider credentials are valid.
- Use `npx prisma studio` (if using Prisma) to inspect data quickly.

Useful commands
```bash
# install deps
pnpm install

# dev server
pnpm dev

# build
pnpm build

# start
pnpm start

# prisma helpers (if Prisma is used)
npx prisma generate
npx prisma migrate dev --name init
npx prisma studio

# convex
npx convex dev
npx convex deploy
```

License
No license specified in the repository. If you plan to open source this project, consider adding an explicit license (for example, MIT).

Acknowledgements
This project was bootstrapped with the T3 Stack (create-t3-app). See the T3 docs for more details: https://create.t3.gg/

Contact / Links
Repository: https://github.com/rithbennet/medisure-app
Live demo: https://medisure-app.vercel.app
