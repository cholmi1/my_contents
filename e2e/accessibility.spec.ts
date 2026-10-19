import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/#/routines', '/#/notes', '/#/apps', '/#/ledger', '/#/settings'];

test('모든 입력 항목에 접근 가능한 라벨이 있다', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const unlabeled = await page.evaluate(() => {
      const normalize = (element: Element | null) =>
        (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

      return [...document.querySelectorAll('input, select, textarea')]
        .filter((element) => (element as HTMLInputElement).type !== 'hidden')
        .map((element) => {
          const labelledBy = element.getAttribute('aria-labelledby');
          const fromIds = labelledBy
            ? labelledBy
                .split(/\s+/)
                .map((id) => normalize(document.getElementById(id)))
                .join(' ')
            : '';
          const fromFor = element.id
            ? normalize(document.querySelector(`label[for="${CSS.escape(element.id)}"]`))
            : '';
          const fromWrap = normalize(element.closest('label'));
          const name =
            fromIds ||
            element.getAttribute('aria-label') ||
            fromFor ||
            fromWrap ||
            element.getAttribute('title') ||
            '';
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            name,
          };
        })
        .filter((control) => !control.name);
    });

    expect(unlabeled, `${route} 화면의 라벨 없는 입력 항목`).toEqual([]);
  }
});

test('키보드로 모바일 메뉴와 대화상자를 닫고 초점을 되돌린다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const menuButton = page.getByRole('button', { name: '메뉴 열기' });
  await menuButton.click();
  const drawer = page.getByRole('dialog', { name: '전체 메뉴' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: '메뉴 닫기' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(menuButton).toBeFocused();

  await page.goto('/#/apps');
  const importButton = page.getByRole('button', { name: 'CSV 가져오기' });
  await importButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Shift+Tab');
  const shiftTabInside = await page.evaluate(
    () => !!document.activeElement?.closest('[role="dialog"]'),
  );
  expect(shiftTabInside).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(importButton).toBeFocused();
});
