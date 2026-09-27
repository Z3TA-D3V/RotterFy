import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.tsx', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.tsx', 'src/utils/**/*.ts'],
      reporter: ['text', 'html'],
      thresholds: { statements: 70, branches: 60, functions: 55, lines: 74 },
    },
  },
});
