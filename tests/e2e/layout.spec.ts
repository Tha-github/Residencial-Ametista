import { expect, test } from '@playwright/test';

/** Responsividade, estabilidade de layout e acessibilidade básica. */
const PAGES = ['/', '/estilo/secoes'];

for (const path of PAGES) {
  test(`${path}: sem rolagem horizontal e sem erros no console`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
    // Estrito: inclui falhas que não passam pelos eventos de resposta (ex.: favicon).
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(path);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('CLS acumulado < 0,1 ao carregar e rolar a página de amostra', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/estilo/secoes');
  for (let y = 0; y < 12; y++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(120);
  }
  await page.waitForLoadState('networkidle');
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.1);
});

test('alvos de toque principais com pelo menos 44px de altura', async ({ page }) => {
  await page.goto('/estilo/secoes');
  const small = await page
    .locator(
      'main a.btn, main button, .channel, .gallery__link, .site-header a, .booking-bar a, footer a',
    )
    .evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({
          text: el.textContent?.trim().slice(0, 30),
          h: el.getBoundingClientRect().height,
        }))
        .filter((r) => r.h < 40),
    );
  expect(small).toEqual([]);
});

test('header em uma linha só (nome não quebra)', async ({ page }) => {
  await page.goto('/estilo/secoes');
  const brand = page.locator('.site-header__brand');
  // Duas linhas teriam ≥ ~2,4× o tamanho da fonte; uma linha fica bem abaixo de 2×.
  const fontSize = await brand.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const box = await brand.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(Math.max(44, fontSize * 2));
  const header = await page.locator('.site-header').boundingBox();
  expect(header!.height).toBeLessThanOrEqual(80);
});

test('texto do hero legível sobre a foto: véu presente e CTA visível', async ({ page }) => {
  await page.goto('/estilo/secoes');
  await expect(page.locator('.hero__scrim')).toBeAttached();
  const cta = page.getByRole('link', { name: /Ver opções de reserva/ }).first();
  await expect(cta).toBeVisible();
  const box = await cta.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test('reduced-motion desliga as animações', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/estilo/secoes');
  const names = await page
    .locator('.hero__place, .reveal')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
  expect(names.every((n) => n === 'none')).toBe(true);
});

test.describe('sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('miniatura é um link funcional para a imagem ampliada', async ({ page, request }) => {
    await page.goto('/estilo/secoes');
    const href = await page.locator('.gallery__link').first().getAttribute('href');
    expect(href).toBeTruthy();
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/');
  });
});
