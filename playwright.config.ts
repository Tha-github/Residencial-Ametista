import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de navegador (galeria, lightbox, responsividade, CLS).
 * Rodam contra o servidor de desenvolvimento, onde existe a página de
 * amostra /estilo/secoes com imagens sintéticas de teste.
 *
 * Navegador: por padrão o Microsoft Edge instalado (sem download).
 * Em CI: PW_CHANNEL=chromium após `npx playwright install chromium`.
 */
const PORT = 4400;
const channel = process.env.PW_CHANNEL ?? 'msedge';
const browser = channel === 'chromium' ? {} : { channel };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  // Gera as variantes de imagem do servidor de dev antes dos testes.
  globalSetup: './tests/e2e/warmup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-320',
      use: {
        ...devices['Desktop Edge'],
        ...browser,
        viewport: { width: 320, height: 640 },
        hasTouch: true,
      },
    },
    {
      name: 'mobile-414',
      use: {
        ...devices['Desktop Edge'],
        ...browser,
        viewport: { width: 414, height: 896 },
        hasTouch: true,
      },
    },
    {
      name: 'tablet-768',
      use: {
        ...devices['Desktop Edge'],
        ...browser,
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: 'desktop-1366',
      use: { ...devices['Desktop Edge'], ...browser, viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: `npx astro dev --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { E2E: '1', PUBLIC_DEPLOY_ENV: 'development' },
  },
});
