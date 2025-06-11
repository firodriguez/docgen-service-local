module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    rules: {
        // Reglas básicas para TypeScript
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-explicit-any': 'off', // Permitir 'any' (especialmente en catch)
        'prefer-const': 'error',
        'no-var': 'error',
        'no-console': 'off', // Permitir console.log
        'eqeqeq': 'error',
    },
    env: {
        node: true,
        jest: true,
        es6: true,
    },
    ignorePatterns: [
        'dist/',
        'node_modules/',
        '*.js',
        'logs/',
        'coverage/',
    ],
  };