// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const features = ['role', 'sessions', 'attendance'];
const shared = ['store', 'types', 'components', 'constants', 'utils', 'data'].map((d) => `./src/${d}`);

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*']),
  expoConfig,
  {
    // Enforces the dependency rules in docs/ARCHITECTURE.md §2–3.
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // Rule 2: features must not import each other (compose them in src/app).
            ...features.map((f) => ({
              target: `./src/features/${f}`,
              from: './src/features',
              except: [`./${f}`],
              message: 'Features must not import each other. Combine them in the route file (docs/ARCHITECTURE.md rule 2).',
            })),
            // Rule 3: shared code must not import features or routes.
            {
              target: shared,
              from: ['./src/features', './src/app'],
              message: 'Shared code must not import from features/ or app/ (docs/ARCHITECTURE.md rule 3).',
            },
            // Features must not import routes.
            {
              target: './src/features',
              from: './src/app',
              message: 'Features must not import from app/ (docs/ARCHITECTURE.md §2).',
            },
          ],
        },
      ],
    },
  },
]);

