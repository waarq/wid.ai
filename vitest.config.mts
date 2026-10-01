import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/*
 * Unit and service tests. Co-locate them as `*.test.ts` next to the code.
 *
 * - `@/*` resolves to `src/*`, matching tsconfig paths.
 * - NODE_ENV is forced to "test": mock latency is 0 and fixture dates are not
 *   rebased (see services/mock/controls.ts and db.ts), so results are deterministic.
 * - Node environment: services, stores and pure functions need no DOM. A test
 *   that does can opt in with a `// @vitest-environment jsdom` docblock once
 *   jsdom is installed.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { NODE_ENV: "test" },
    restoreMocks: true,
  },
})
