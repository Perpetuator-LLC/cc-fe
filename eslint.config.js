// Copyright (c) 2025 Perpetuator LLC
// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintPluginPrettier = require('eslint-plugin-prettier');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    ignores: ['src/app/graphql-types.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      // ...eslintPluginPrettier.configs.recommended,
      // 'plugin:prettier/recommended', // Extends ESLint config to adopt prettier settings
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // 'object-curly-spacing': ['error', 'always'],
      'max-len': ['error', { code: 120 }],
      // 'prettier/prettier': ['error', { printWidth: 120 }],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // MD3 Best Practices - Template Rules
      '@angular-eslint/template/no-inline-styles': [
        'error',
        {
          allowNgStyle: false,
        },
      ],
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/use-track-by-function': 'warn',
      '@angular-eslint/template/prefer-self-closing-tags': 'warn',
      '@angular-eslint/template/conditional-complexity': ['warn', { maxComplexity: 3 }],
      '@angular-eslint/template/cyclomatic-complexity': ['warn', { maxComplexity: 10 }],
      '@angular-eslint/template/no-call-expression': 'warn',
    },
  },
);
