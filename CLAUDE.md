# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time: install deps + prisma generate + DB migrations
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run db:reset     # Force-reset SQLite database
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

Requires `ANTHROPIC_API_KEY` in `.env`; the app falls back to a mock provider without it.

The database schema is defined in `prisma/schema.prisma`. Reference it whenever you need to understand the structure of data stored in the database.

## Code Style

- Use comments sparingly — only on genuinely complex logic where the intent isn't clear from the code itself.
- Follow good practices: meaningful names, small focused functions, avoid duplication, match existing codebase style.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in natural language; Claude generates code via tool calls; the result renders in a live iframe preview.

### Data Flow

1. **Chat input** → `ChatContext` (wraps `@ai-sdk/react` `useChat`) → `/api/chat` (streaming)
2. **API route** invokes Claude with two tools: `str_replace_editor` (create/view/edit files) and `file_manager` (rename/delete)
3. **Tool calls** are applied to `VirtualFileSystem` (in-memory only, never written to disk)
4. **FileSystemContext** propagates file changes → `PreviewFrame` re-renders iframe
5. **Persistence**: On stream finish, serialized VirtualFileSystem + messages are saved to Prisma (SQLite)

### Key Modules

| Path | Role |
|------|------|
| `src/lib/file-system.ts` | Core in-memory virtual file tree; serializes to/from JSON for DB storage |
| `src/lib/contexts/chat-context.tsx` | Manages AI chat state; routes tool calls to VirtualFileSystem mutations |
| `src/lib/contexts/file-system-context.tsx` | React context for file state; deserializes persisted data on project load |
| `src/lib/transform/jsx-transformer.ts` | Client-side Babel transpilation (JSX→ES5); builds import maps; injects CSS for iframe |
| `src/components/preview/PreviewFrame.tsx` | Iframe renderer; auto-detects entry point (App.jsx → index.jsx → first .jsx) |
| `src/lib/tools/` | AI tool definitions (`str_replace_editor`, `file_manager`) |
| `src/lib/prompts/generation.tsx` | System prompt; instructs Claude to use `@/` imports and `/App.jsx` as entry point |
| `src/lib/provider.ts` | Selects Anthropic provider or mock fallback; mock streams 4 static steps for UX without API costs |
| `src/lib/auth.ts` | JWT sessions via cookies (7-day expiry); no dedicated auth routes — auth is modal/server-action based |
| `src/actions/index.ts` | Server actions: sign up, sign in, sign out, project CRUD |
| `src/middleware.ts` | Protects `/api/projects` and `/api/filesystem`; public routes include `/api/chat` |

### Route Structure

- `/` — Home; redirects authenticated users to their latest project
- `/[projectId]` — Loads project from DB, hydrates FileSystem + Chat history
- `/api/chat` — Streaming chat endpoint; saves state to DB on finish

### Non-Obvious Design Decisions

- **Virtual FS is RAM-only**: Files never touch disk. The entire project is a JSON-serialized tree in Prisma's `Project.files` column. Avoids I/O for instant preview.
- **Babel runs in the browser**: `@babel/standalone` transpiles JSX client-side inside the preview pipeline, not at build time.
- **Tool-mediated mutations**: AI emits structured tool calls rather than free-form text; the client applies them atomically, keeping preview and DB in sync.
- **Prompt caching**: System prompt uses `cacheControl: { type: "ephemeral" }` to reduce token costs on repeated chat turns.
- **Anonymous work**: Non-authenticated sessions track generated work in `localStorage` via `src/lib/anon-work-tracker.ts`.
- **Resizable panels**: UI is split into chat (35%), code editor, and preview using `react-resizable-panels`.
- **Path alias**: `@/*` resolves to `src/*` (see `tsconfig.json`). Generated code uses `@/` imports.
