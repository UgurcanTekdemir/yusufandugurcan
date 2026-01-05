# Yusuf and Dugurcan Monorepo

A monorepo structure for a Next.js (App Router) + TypeScript project with shared packages and tooling.

## Structure

```
yusufandugurcan/
├── apps/
│   └── web/              # Next.js App Router application
├── packages/
│   └── shared/           # Shared types, Zod schemas, and constants
├── tooling/              # Shared ESLint and TypeScript configurations
│   ├── eslint-config/
│   └── typescript-config/
├── package.json          # Root workspace configuration
└── README.md
```

## Prerequisites

- Node.js 18+ 
- npm 9+ (for workspaces support)

## Installation

Install all dependencies for the monorepo:

```bash
npm install
```

This will install dependencies for all workspaces (apps, packages, and tooling).

## Development

### Run the Next.js app

From the root directory:

```bash
npm run dev
```

Or from the app directory:

```bash
cd apps/web
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build

Build all packages and apps:

```bash
npm run build
```

Build a specific workspace:

```bash
npm run build --workspace=apps/web
npm run build --workspace=packages/shared
```

### Linting

Lint all workspaces:

```bash
npm run lint
```

Lint a specific workspace:

```bash
npm run lint --workspace=apps/web
```

### Formatting

Format all code with Prettier:

```bash
npm run format
```

### Type Checking

Type check all workspaces:

```bash
npm run type-check
```

## Workspaces

### `apps/web`

Next.js application with:
- App Router
- TypeScript
- TailwindCSS
- TanStack Query
- ESLint + Prettier

### `packages/shared`

Shared package containing:
- **Types**: TypeScript type definitions (User, Dealer, Slip, Transaction, FixtureDTO, OddsDTO)
- **Schemas**: Zod validation schemas (SlipCreateInput, TransactionInput, FixtureDTOSchema, OddsDTOSchema)
- **Constants**: Markets whitelist and bookmaker configuration

Import from shared:

```typescript
import { User, Slip, FixtureDTO } from "@repo/shared";
import { SlipCreateInputSchema } from "@repo/shared/schemas";
import { marketsWhitelist, bookmakerConfig } from "@repo/shared/constants";
```

### `tooling/`

Shared tooling configurations:
- `eslint-config`: ESLint configuration
- `typescript-config`: TypeScript configurations (base and Next.js)

## Environment Variables

Environment variables must be configured in `apps/web/.env.local` (this file is git-ignored).

### Location

**Important**: The `.env.local` file must be located at `apps/web/.env.local` (next to `next.config.js`).

When running `npm run dev` from the repo root, the script automatically changes directory to `apps/web` before starting Next.js, ensuring environment variables are loaded correctly. If you change environment variables, restart the dev server for changes to take effect.

### Required Variables

Create `apps/web/.env.local` with the following variables:

```env
# Firebase Web App Configuration (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# SportMonks API
SPORTMONKS_API_TOKEN=your_token

# Upstash Redis (optional)
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. All other variables are server-only.

## Firebase Emulator

The project includes Firebase Cloud Functions for RBAC (Role-Based Access Control) management. You can run these functions locally using the Firebase Emulator Suite.

### Prerequisites

Install Firebase CLI globally:

```bash
npm install -g firebase-tools
```

Login to Firebase (if deploying to production):

```bash
firebase login
```

### Starting the Emulators

From the root directory, start the Firebase emulators:

```bash
firebase emulators:start
```

This will start:
- **Functions Emulator** on port `5001`
- **Auth Emulator** on port `9099`
- **Firestore Emulator** on port `8080`
- **Emulator UI** on port `4000`

Access the Emulator UI at `http://localhost:4000` to view and interact with the emulators.

### Using Emulators with Next.js App

When running the Next.js app with emulators, configure your Firebase client to use the emulators:

1. Update `apps/web/.env.local` (or `.env`) with emulator configuration:
   ```
   NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true
   ```

2. The Firebase client SDK will automatically connect to the emulators when `NEXT_PUBLIC_FIREBASE_USE_EMULATOR` is set.

### Cloud Functions

The project includes the following Cloud Functions in `functions/src/index.ts`:

- **`onUserCreate`**: Auth trigger that sets default role 'user' when a new user is created
- **`setUserRole`**: Callable function (superadmin-only) to set user role and dealerId
- **`createDealer`**: Callable function (superadmin-only) to create a dealer document
- **`createUser`**: Callable function (superadmin or dealer) to create a new user with role and dealerId

### Building Functions

Build the functions:

```bash
cd functions
npm run build
```

### Deploying Functions

Deploy functions to Firebase:

```bash
firebase deploy --only functions
```

Or from the root:

```bash
cd functions
npm run deploy
```

## Scripts Reference

### Root Scripts

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build all workspaces
- `npm run lint` - Lint all workspaces
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check all workspaces

### App Scripts (`apps/web`)

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build Next.js app
- `npm run start` - Start production server
- `npm run lint` - Lint with ESLint
- `npm run format` - Format with Prettier
- `npm run type-check` - Type check with TypeScript

### Shared Package Scripts (`packages/shared`)

- `npm run build` - Compile TypeScript
- `npm run dev` - Watch mode compilation
- `npm run type-check` - Type check without emitting
