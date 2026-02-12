# src/

**Shared Source Code — Write Once**

All platform-agnostic business logic, UI components, hooks, utilities, and integrations.

## Directory Structure

- **app/** — Next.js app directory (pages, layouts, routing)
- **components/** — Reusable UI components (buttons, cards, modals, etc.)
- **hooks/** — Custom React hooks (useAuth, usePlayback, useCatalog, etc.)
- **lib/** — Business logic and domain models
- **utils/** — Pure utility functions (date formatting, string manipulation, etc.)
- **types/** — TypeScript type definitions and interfaces
- **styles/** — Global styles, CSS modules, theme configuration
- **integrations/** — Backend API clients, GraphQL queries, adapters

## Guidelines

1. **Platform-agnostic** — No platform-specific code here (no window, no native modules)
2. **Fully typed** — All exports must have TypeScript types
3. **100% tested** — Every function/hook/component must have unit tests
4. **Framework-agnostic where possible** — Business logic should work without React
5. **No hardcoded values** — Use environment variables or configuration

## Import Conventions

```typescript
// ✅ Good: Import from src/ using absolute paths (configured via tsconfig)
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/date'

// ❌ Bad: Relative imports that break when files move
import { Button } from '../../../components/Button'
```

## Testing

Every file in src/ must have a corresponding test file:

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts
└── utils/
    ├── date.ts
    └── date.test.ts
```

Run tests: `pnpm test`
