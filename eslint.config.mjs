import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // New in eslint-plugin-react-hooks 7 (ships with eslint-config-next 16). Existing code
    // trips these; keep them visible as warnings until the components are reworked.
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // `properties: 'never'` leaves object keys alone (`cx`, `cy`, ...); only declared names
    // (variables, parameters, functions, imports) must be at least 3 characters.
    // Exceptions: `_` is the unused-placeholder convention (see `argsIgnorePattern` above),
    // `id` is the Payload document field, `fs`/`os` are Node module names, `cn` is shadcn's
    // class-name helper.
    files: ['src/**/*.{ts,tsx,js,mjs}', 'tests/**/*.{ts,tsx}', 'scripts/**/*.{ts,mjs}'],
    rules: {
      'id-length': [
        'error',
        { min: 3, properties: 'never', exceptions: ['_', 'id', 'fs', 'os', 'cn'] },
      ],
    },
  },
  {
    ignores: [
      '.next/',
      'playwright-report/',
      'test-results/',
      'src/payload-types.ts',
      'src/app/(payload)/admin/importMap.js',
    ],
  },
]

export default eslintConfig
