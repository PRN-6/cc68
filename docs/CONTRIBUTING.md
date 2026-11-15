# Contributing to EyeHand (cc68)

## Development Workflow
1. Ensure all code adheres to strict TypeScript standards (`noImplicitAny`, strict null checks).
2. Keep `@cc68/core` completely free of external dependencies.
3. Every new mathematical transform, filter, or event bus extension must include dedicated Vitest unit tests.
4. Verify tests and typechecking before committing:
   ```bash
   pnpm test
   pnpm run typecheck
   ```
