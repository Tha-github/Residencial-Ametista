import { expect, test, type Page } from '@playwright/test';

/**
 * Galeria e modo ampliado na página de amostra (imagens sintéticas).
 * Ordem narrativa esperada (ver src/dev/secoes.astro):
 * fachada(1) → social(2, 3) → quartos(5) → terraço(4) → detalhes(6) → sem grupo(7, 8)
 */
const SAMPLE = '/estilo/secoes';
const EXPECTED_ORDER = [
  'teste 1',
  'teste 2',
  'teste 3',
  'teste 5',
  'teste 4',
  'teste 6',
  'teste 7',
  'teste 8',
];

const lightbox = (page: Page) => page.locator('[data-lightbox]');
const counter = (page: Page) => page.locator('[data-lightbox-counter]');
const thumbs = (page: Page) => page.locator('.gallery__grid .gallery__link');

test.beforeEach(async ({ page }) => {
  await page.goto(SAMPLE);
  await page.locator('#galeria').scrollIntoViewIfNeeded();
});

test('grade mostra 6 fotos na ordem narrativa e oferece "ver todas"', async ({ page }) => {
  await expect(thumbs(page)).toHaveCount(6);
  const labels = await page
    .locator('[data-gallery-item]')
    .evaluateAll((els) =>
      els
        .sort(
          (a, b) =>
            Number((a as HTMLElement).dataset.galleryItem) -
            Number((b as HTMLElement).dataset.galleryItem),
        )
        .map((el) => el.getAttribute('aria-label') ?? ''),
    );
  expect(labels.map((l) => l.replace(/^.*\[AMOSTRA\] /, ''))).toEqual(EXPECTED_ORDER);
  await expect(page.getByRole('link', { name: 'Ver todas as 8 fotos' })).toBeVisible();
});

test('cada foto preenche a sua célula da grade (sem vãos)', async ({ page }) => {
  const gaps = await page.locator('.gallery__grid .gallery__item').evaluateAll((items) =>
    items.map((li) => {
      const img = li.querySelector('img')!.getBoundingClientRect();
      const cell = li.getBoundingClientRect();
      return Math.abs(cell.height - img.height) + Math.abs(cell.width - img.width);
    }),
  );
  for (const gap of gaps) expect(gap).toBeLessThanOrEqual(2);
});

test('miniaturas: dimensões declaradas (sem CLS), lazy-load e formatos modernos', async ({
  page,
}) => {
  const imgs = page.locator('.gallery__grid img');
  for (const img of await imgs.all()) {
    await expect(img).toHaveAttribute('width', /\d+/);
    await expect(img).toHaveAttribute('height', /\d+/);
    await expect(img).toHaveAttribute('loading', 'lazy');
  }
  const sources = await page
    .locator('.gallery__grid picture source')
    .evaluateAll((els) => els.map((el) => el.getAttribute('type')));
  expect(sources).toContain('image/avif');
  expect(sources).toContain('image/webp');
});

test('hero (LCP) não usa lazy-load e tem prioridade alta', async ({ page }) => {
  const hero = page.locator('.hero__img');
  await expect(hero).toHaveAttribute('loading', 'eager');
  await expect(hero).toHaveAttribute('fetchpriority', 'high');
});

test('teclado: abre, navega com setas/Home/End, fecha com Esc e devolve o foco', async ({
  page,
}) => {
  await thumbs(page).nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(lightbox(page)).toBeVisible();
  await expect(counter(page)).toHaveText('Foto 3 de 8');
  // Foco dentro do modo ampliado
  expect(await lightbox(page).evaluate((d) => d.contains(document.activeElement))).toBe(true);

  await page.keyboard.press('ArrowRight');
  await expect(counter(page)).toHaveText('Foto 4 de 8');
  await page.keyboard.press('End');
  await expect(counter(page)).toHaveText('Foto 8 de 8');
  await page.keyboard.press('ArrowRight');
  await expect(counter(page)).toHaveText('Foto 1 de 8');
  await page.keyboard.press('ArrowLeft');
  await expect(counter(page)).toHaveText('Foto 8 de 8');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(counter(page)).toHaveText('Foto 4 de 8');

  await page.keyboard.press('Escape');
  await expect(lightbox(page)).toBeHidden();
  // Foco volta para a miniatura da foto que estava aberta
  await expect(thumbs(page).nth(3)).toBeFocused();
});

test('foto fora da grade: ao fechar, foco volta ao gatilho', async ({ page }) => {
  const all = page.getByRole('link', { name: 'Ver todas as 8 fotos' });
  await all.focus();
  await page.keyboard.press('Enter');
  await expect(counter(page)).toHaveText('Foto 1 de 8');
  await page.keyboard.press('End');
  await page.keyboard.press('Escape');
  await expect(all).toBeFocused();
});

test('Tab permanece dentro do modo ampliado; fundo inerte', async ({ page }) => {
  await thumbs(page).first().click();
  await expect(lightbox(page)).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const inside = await lightbox(page).evaluate(
      (d) => document.activeElement === document.body || d.contains(document.activeElement),
    );
    expect(inside).toBe(true);
  }
  await expect(page.locator('.site-header a').first()).not.toBeFocused();
});

test('imagem ampliada carrega, tem alt e legenda só quando fornecida', async ({ page }) => {
  await thumbs(page).first().click();
  const img = page.locator('[data-lightbox-img]');
  await expect(img).toHaveAttribute('alt', '[AMOSTRA] teste 1');
  // Em dev a variante ampliada é gerada sob demanda: a 1ª carga pode demorar.
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);
  await expect(page.locator('[data-lightbox-caption]')).toHaveText('[AMOSTRA] Legenda opcional');

  await page.locator('[data-lightbox-next]').click();
  await expect(page.locator('[data-lightbox-caption]')).toBeHidden();
});

test('fecha pelo botão e pelo clique fora da imagem', async ({ page }) => {
  await thumbs(page).first().click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(lightbox(page)).toBeHidden();

  await thumbs(page).first().click();
  await page.locator('.lightbox__figure').click({ position: { x: 2, y: 2 } });
  await expect(lightbox(page)).toBeHidden();
});

test('rolagem da página bloqueada com o modo ampliado aberto', async ({ page }) => {
  await thumbs(page).first().click();
  const overflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
  expect(overflow).toBe('hidden');
});

test('controles do modo ampliado têm área de toque ≥ 44px', async ({ page }) => {
  await thumbs(page).first().click();
  for (const sel of ['[data-lightbox-close]', '[data-lightbox-prev]', '[data-lightbox-next]']) {
    const box = await page.locator(sel).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test.describe('tour por ambiente (página real)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#galeria').scrollIntoViewIfNeeded();
  });

  test('cada ambiente abre o modo ampliado na foto certa e navega por todas', async ({ page }) => {
    const links = page.locator('.tour__link');
    expect(await links.count()).toBeGreaterThan(4);
    // Primeira foto do 2º ambiente
    const second = page.locator('.room').nth(1).locator('.tour__link').first();
    const index = Number(await second.getAttribute('data-gallery-item'));
    await second.click();
    await expect(lightbox(page)).toBeVisible();
    const total = await page
      .locator('[data-gallery] [data-gallery-item]')
      .evaluateAll((els) => new Set(els.map((e) => (e as HTMLElement).dataset.galleryItem)).size);
    await expect(counter(page)).toHaveText(`Foto ${index + 1} de ${total}`);
    await page.keyboard.press('End');
    await expect(counter(page)).toHaveText(`Foto ${total} de ${total}`);
    await page.keyboard.press('Escape');
    await expect(lightbox(page)).toBeHidden();
  });

  test('"ver todas" abre na primeira foto', async ({ page }) => {
    await page.getByRole('link', { name: /Ver todas as \d+ fotos/ }).click();
    await expect(counter(page)).toHaveText(/^Foto 1 de \d+$/);
  });
});

test('imagem ampliada visível, grande e inteira na tela (sem cortes)', async ({ page }) => {
  for (const i of [0, 1, 5]) {
    await thumbs(page).nth(i).click();
    const img = page.locator('[data-lightbox-img]');
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0)), {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
    await expect(lightbox(page)).not.toHaveAttribute('data-loading', '');
    await expect(img).toHaveCSS('opacity', '1');
    const box = await img.boundingBox();
    const vp = page.viewportSize()!;
    // Ocupa boa parte da tela em pelo menos uma dimensão (não é um "pontinho")
    expect(Math.max(box!.width / vp.width, box!.height / vp.height)).toBeGreaterThan(0.6);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
    await page.keyboard.press('Escape');
  }
});
