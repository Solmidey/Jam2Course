module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  env: {
    worker: true,
    node: true,
    es2022: true
  },
  ignorePatterns: ['dist', '.wrangler', 'schemas'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      }
    }
  },
  rules: {
    'import/no-default-export': 'off',
    '@typescript-eslint/no-floating-promises': 'error'
  }
};
