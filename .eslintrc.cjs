module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dist-electron', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // IPC bridge & dynamic API responses legitimately use `any`
    '@typescript-eslint/no-explicit-any': 'warn',
    // Unused vars: allow underscore-prefixed to signal intentional
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Empty catch/finally blocks are acceptable in UI error handlers
    'no-empty': ['error', { allowEmptyCatch: false }],
    // useEffect deps: warn only (many are intentionally run-once)
    'react-hooks/exhaustive-deps': 'warn',
  },
}
