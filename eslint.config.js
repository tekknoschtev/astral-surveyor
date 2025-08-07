import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'js/**', 'node_modules/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Relax strict rules for migration period
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      
      // Keep these rules active for code quality
      'no-console': 'off', // Allow console for game logging
      'prefer-const': 'warn'
    }
  },
  {
    files: ['tests/**/*.js'],
    rules: {
      // Test files can be more relaxed
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off' // Vitest globals
    }
  }
);