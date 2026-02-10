// ESLint 9+ Flat Config
// Migration from ESLint 8: https://eslint.org/docs/latest/use/configure/migration-guide

import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React specific
      'react/prop-types': 'off', // Using TypeScript for type checking
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      
      // Best practices
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn', // Warn about console in frontend
      'no-debugger': 'warn',
      
      // Code style
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
      
      // Modern JS
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
