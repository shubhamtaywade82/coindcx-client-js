import { defineConfig } from 'tsup';

export default defineConfig([
  {
    // `src/mcp/index.ts` is its own entry so MCP consumers never load the
    // REST, WS or paper-engine code paths they don't need.
    entry: ['src/index.ts', 'src/mcp/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    shims: true,
    treeshake: true,
    // Explicit .mjs/.cjs rather than a bare .js: the package has no `"type":
    // "module"`, so Node would parse an ESM `dist/index.js` as CommonJS and
    // named imports would fail for ESM consumers.
    outExtension({ format }) {
      return {
        js: format === 'esm' ? '.mjs' : '.cjs',
      };
    },
  },
  {
    // Standalone MCP server executable published via the `bin` field. Built
    // separately (own outDir, no dts) so it doesn't pull `bin/` - which sits
    // outside the `src` rootDir - into the library's tsc-driven .d.ts build.
    entry: { mcp: 'bin/mcp.ts' },
    format: ['cjs'],
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: true,
    shims: true,
    treeshake: true,
    outDir: 'dist/bin',
    outExtension() {
      return { js: '.cjs' };
    },
  },
]);
