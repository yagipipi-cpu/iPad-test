import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

function appVersion(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: '/iPad-test/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
});
