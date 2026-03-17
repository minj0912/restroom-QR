# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a toilet hygiene inspection checklist web application (화장실 위생점검표) powered by React + Vite + Firebase Firestore.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Firebase Firestore (for the inspection app), PostgreSQL + Drizzle ORM (shared API server)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── toilet-inspection/      # React + Vite web app (화장실 위생점검표)
│   │   └── src/
│   │       ├── types/          # TypeScript types (restroom, inspection, template)
│   │       ├── lib/            # Firebase init + Firestore CRUD functions
│   │       └── App.tsx         # Full single-page app (all modes & UI)
│   └── api-server/             # Express API server (shared backend)
├── lib/                        # Shared libraries
│   ├── api-spec/               # OpenAPI spec + Orval codegen config
│   ├── api-client-react/       # Generated React Query hooks
│   ├── api-zod/                # Generated Zod schemas from OpenAPI
│   └── db/                     # Drizzle ORM schema + DB connection
├── scripts/                    # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## 화장실 위생점검표 App

### Purpose
Replaces paper-based daily toilet hygiene checklists with a QR-accessible web app.

### Modes
1. **일반모드 (viewer)** — read-only access to inspection records
2. **점검자모드 (inspector)** — code: `6481` — can input and save inspection data
3. **관리자모드 (admin)** — code: `6167` — all above + manage restrooms and template items

### Firebase Firestore Collections
- `restrooms` — list of restrooms
- `inspectionTemplates` — inspection item templates (default: `default_template`)
- `inspectionRecords` — daily records, doc ID format: `YYYY-MM-DD_restroomId`

### Required Environment Secrets
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Firestore Index Notes
The `fetchRestrooms()` query uses a compound query (`where("enabled", "==", true)` + `orderBy("sortOrder")`).
Firestore may require a composite index for this. If you see a Firestore index error in the browser console, follow the link in the error message to create it automatically in the Firebase Console.

### Key Files
- `artifacts/toilet-inspection/src/App.tsx` — entire UI, state, mode switching
- `artifacts/toilet-inspection/src/lib/firebase.ts` — Firebase initialization
- `artifacts/toilet-inspection/src/lib/firestore.ts` — Firestore read/write helpers
- `artifacts/toilet-inspection/src/types/` — TypeScript interfaces

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build`
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
