import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'android/**',
      'tmp-icons/**',
      'tmp_video_frames/**',
      'tmp_video_frames_wmp/**',
      'public/fonts/**',
      '*.log',
      'preview.log',
      'preview.out.log',
      'vite-dev.log',
      'vite-dev.err.log',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      prettier,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React$)' },
      ],
      'no-unused-vars': 'off',
      'prettier/prettier': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      prettier,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      // react-hooks v7 strict rule; flag as warning while a dedicated refactor is pending
      'react-hooks/set-state-in-effect': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React$)' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
        },
      ],
      'prettier/prettier': 'warn',
    },
  },
  {
    files: ['tests/**/*.js', 'scripts/**/*.{js,mjs}'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
  prettierConfig,
];
