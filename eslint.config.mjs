import next from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['.next/', 'node_modules/'] },
  ...next,
  {
    rules: {
      // React Compiler advisory: flags syncing fetched data into form state / fetching inside effects.
      // These are performance hints (an extra render), not bugs; tracked as tech debt in docs/production-readiness-report.md.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
