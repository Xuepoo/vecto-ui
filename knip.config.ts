import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: [],
      project: ['**/*.{js,ts}'],
    },
    'packages/*': {
      entry: ['src/index.{js,ts}'],
      project: ['src/**/*.{js,ts}'],
    },
    'apps/*': {
      // src/main.ts is the demo router; src/bench.ts (bench.html) and
      // src/compare-dom.ts (compare.html) are headless benchmark/comparison entries.
      entry: ['src/main.{js,ts}', 'src/bench.ts', 'src/compare-dom.ts'],
      project: ['**/*.{js,ts}'],
    },
  },
  // playwright is used from the global install by the benchmark/comparison scripts
  // (not a dep); readlink/which/vite are binaries invoked there.
  ignoreDependencies: ['playwright'],
  ignoreBinaries: ['readlink', 'which', 'vite'],
};

export default config;
