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
      thresholds: { statements: 50, branches: 40, functions: 45, lines: 50 },
    },
  },
});
