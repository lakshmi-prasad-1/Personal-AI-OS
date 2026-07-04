---
name: pnpm zod/v4 subpath resolution
description: A workspace package importing "zod/v4" fails to resolve unless zod is listed as its own direct dependency.
---

In a pnpm workspace, `import { z } from "zod/v4"` only resolves if the importing package's own `package.json` lists `zod` as a dependency. Getting `zod` transitively through another workspace package (e.g. via `@workspace/db` or a generated `@workspace/api-zod`) is not enough — pnpm's isolated `node_modules` per package won't expose the `zod/v4` subpath export to a package that doesn't declare it itself.

**Why:** pnpm strictly isolates dependencies per package; subpath exports (like `zod/v4`) are resolved against the importing package's own `node_modules`, not hoisted transitive deps.

**How to apply:** Before writing code in a new backend/service package that needs `zod/v4` (or any package with subpath exports), check that package's `package.json` has the dependency listed directly (use the workspace catalog version, e.g. `"zod": "catalog:"`), then run `pnpm install` before typechecking.
