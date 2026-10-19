import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const APPS_SAMPLE = path.resolve('public/samples/apps-import-sample.csv');

test('메모·할 일과 완료 상태가 새로고침 후에도 유지된다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('년');

  await page.getByLabel('지금 떠오른 생각이나 할 일').fill('새로고침 유지용 빠른 메모');
  await page.getByRole('button', { name: '메모 저장' }).click();
  await expect(page.getByText('메모·할 일 메뉴에 저장되었습니다.')).toBeVisible();
  await page.getByRole('link', { name: '메모·할 일에서 보기' }).click();
  await expect(page).toHaveURL(/#\/notes/);
  await expect(page.locator('.note-title').filter({ hasText: '새로고침 유지용 빠른 메모' })).toBeVisible();

  await page.locator('#new-note-title-input').fill('새로고침 유지용 할 일');
  await page.getByRole('button', { name: '할 일 추가' }).click();
  const checkbox = page.getByRole('checkbox', { name: '새로고침 유지용 할 일 완료' });
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await page.reload();
  await expect(page.locator('.note-title').filter({ hasText: '새로고침 유지용 빠른 메모' })).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: '새로고침 유지용 할 일 완료' }),
  ).toBeChecked();
});

test('반복 업무 완료는 해당 회차에만 적용된다', async ({ page }) => {
  await page.goto('/#/routines');
  const card = page.locator('.routine-card').filter({ hasText: '물 2L 마시기' });
  await expect(card).toBeVisible();

  const todayCheckbox = card.locator('.occurrence.today input[type="checkbox"]');
  await todayCheckbox.check();
  await expect(todayCheckbox).toBeChecked();
  const otherCheckbox = card.locator('.occurrence').nth(3).locator('input[type="checkbox"]');
  await expect(otherCheckbox).not.toBeChecked();

  await page.reload();
  const reloaded = page.locator('.routine-card').filter({ hasText: '물 2L 마시기' });
  await expect(reloaded.locator('.occurrence.today input[type="checkbox"]')).toBeChecked();
  await expect(
    reloaded.locator('.occurrence').nth(3).locator('input[type="checkbox"]'),
  ).not.toBeChecked();

  await expect(page.getByText('요가 수업 듣기')).toBeVisible();
  await expect(
    page.locator('.routine-card').filter({ hasText: '요가 수업 듣기' }).locator('.badge', {
      hasText: '설정 필요',
    }),
  ).toBeVisible();
});

test('CSV 미리보기·중복 후보·회사 제외·선택 가져오기가 작동한다', async ({ page }) => {
  await page.goto('/#/apps');
  await page.getByRole('button', { name: 'CSV 가져오기' }).click();
  await page.getByLabel('CSV 파일 선택').setInputFiles(APPS_SAMPLE);
  await expect(page.getByText('3. 미리보기와 선택')).toBeVisible();

  const companyRow = page.locator('.preview-table tbody tr').filter({
    hasText: '회사 업무 게시판',
  });
  await expect(companyRow.getByText('회사 관련 제외 후보')).toBeVisible();
  await expect(companyRow.getByRole('checkbox')).not.toBeChecked();

  const duplicateRow = page.locator('.preview-table tbody tr').filter({ hasText: '생활 위키' });
  await expect(duplicateRow.getByText('중복 후보: 생활 위키')).toBeVisible();
  await expect(duplicateRow.getByRole('checkbox')).not.toBeChecked();

  const invalidRow = page.locator('.preview-table tbody tr').filter({ hasText: '잘못된 주소' });
  await expect(invalidRow.getByText(/http 또는 https/)).toBeVisible();
  await expect(invalidRow.getByRole('checkbox')).toBeDisabled();

  const importButton = page.getByRole('button', { name: /선택한 \d+개 가져오기/ });
  await expect(importButton).toHaveText(/선택한 5개 가져오기/);
  await importButton.click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });

  const importedCard = page.locator('.entity-card').filter({ hasText: '가상 독서 기록' });
  await expect(importedCard).toBeVisible();
  await expect(page.locator('.entity-card').filter({ hasText: '회사 업무 게시판' })).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.entity-card').filter({ hasText: '가상 독서 기록' })).toBeVisible();
  await expect(page.locator('.entity-card').filter({ hasText: '회사 업무 게시판' })).toHaveCount(0);
});

test('가계부 수입·지출·이체 합계와 잔액 스냅샷이 분리된다', async ({ page }) => {
  await page.goto('/#/ledger');
  const snapshotCard = page.locator('.account-balances .balance-card').filter({
    hasText: '생활비 통장',
  });
  await expect(snapshotCard).toContainText('1,250,000원');

  await page.locator('#tx-date').fill(await currentKstDate());
  await page.locator('#tx-account').selectOption({ label: '생활비 통장' });
  await page.locator('#tx-type').selectOption('income');
  await page.locator('#tx-category').fill('테스트 수입');
  await page.locator('#tx-amount').fill('100000');
  await page.getByRole('button', { name: '거래 저장' }).click();

  await page.locator('#tx-type').selectOption('expense');
  await page.locator('#tx-category').fill('테스트 지출');
  await page.locator('#tx-amount').fill('30000');
  await page.getByRole('button', { name: '거래 저장' }).click();

  await page.locator('#tx-type').selectOption('transfer');
  await page.locator('#tx-account').selectOption({ label: '생활비 통장' });
  await page.locator('#tx-to-account').selectOption({ label: '비상금 통장' });
  await page.locator('#tx-category').fill('테스트 이체');
  await page.locator('#tx-amount').fill('20000');
  await page.getByRole('button', { name: '거래 저장' }).click();

  await expect(page.locator('.stat.income .stat-value')).toHaveText('100,000원');
  await expect(page.locator('.stat.expense .stat-value')).toHaveText('30,000원');
  await expect(page.locator('.stat').nth(2).locator('.stat-value')).toHaveText('70,000원');
  await expect(snapshotCard).toContainText('1,250,000원');

  await page.getByRole('button', { name: '금액 숨기기' }).click();
  await expect(page.locator('.stat.income .stat-value')).toHaveText('••••원');
  await page.getByRole('button', { name: '금액 보이기' }).click();

  await page.reload();
  await expect(page.locator('.stat.income .stat-value')).toHaveText('100,000원');
  await expect(page.locator('.stat.expense .stat-value')).toHaveText('30,000원');
  await expect(
    page.locator('.account-balances .balance-card').filter({ hasText: '생활비 통장' }),
  ).toContainText('1,250,000원');
});

test('허브 백업을 복원하고 잘못된 JSON은 기존 데이터를 보존한다', async ({ page }) => {
  await page.goto('/#/notes');
  await page.getByRole('button', { name: '메모', exact: true }).click();
  await page.locator('#new-note-title-input').fill('백업 전 임시 메모');
  await page.getByRole('button', { name: '메모 추가' }).click();
  await expect(page.locator('.note-title').filter({ hasText: '백업 전 임시 메모' })).toBeVisible();

  await page.goto('/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '허브 JSON 내보내기' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const raw = fs.readFileSync(downloadPath!, 'utf8');
  const parsed = JSON.parse(raw) as { app: string; kind: string; schemaVersion: number };
  expect(parsed.app).toBe('personal-hub');
  expect(parsed.kind).toBe('hub');
  expect(parsed.schemaVersion).toBe(1);

  await page.goto('/#/notes');
  await page.getByRole('button', { name: '메모', exact: true }).click();
  await page.locator('#new-note-title-input').fill('백업 후 새 메모');
  await page.getByRole('button', { name: '메모 추가' }).click();
  await expect(page.locator('.note-title').filter({ hasText: '백업 후 새 메모' })).toBeVisible();

  await page.goto('/#/settings');
  await page.getByLabel('허브 JSON 백업 파일 선택').setInputFiles(downloadPath!);
  await expect(page.getByRole('dialog')).toBeVisible();
  const confirmButton = page.getByRole('button', { name: '가져오기 실행' });
  await expect(confirmButton).toBeDisabled();
  await page.getByRole('checkbox', { name: '기존 데이터를 모두 교체하는 것에 동의합니다.' }).check();
  await confirmButton.click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.goto('/#/notes');
  await expect(page.locator('.note-title').filter({ hasText: '백업 전 임시 메모' })).toBeVisible();
  await expect(page.locator('.note-title').filter({ hasText: '백업 후 새 메모' })).toHaveCount(0);

  const invalidPath = test.info().outputPath('invalid-hub.json');
  fs.mkdirSync(path.dirname(invalidPath), { recursive: true });
  fs.writeFileSync(
    invalidPath,
    JSON.stringify({
      app: 'personal-hub',
      kind: 'hub',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: { schemaVersion: 1 },
    }),
  );
  await page.goto('/#/settings');
  await page.getByLabel('허브 JSON 백업 파일 선택').setInputFiles(invalidPath);
  await expect(page.getByText(/가져오지 않았습니다/)).toBeVisible();
  await page.goto('/#/notes');
  await expect(page.locator('.note-title').filter({ hasText: '백업 전 임시 메모' })).toBeVisible();
});

test('가계부 백업은 허브와 독립적으로 복원된다', async ({ page }) => {
  await page.goto('/#/ledger');
  await page.locator('#tx-date').fill(await currentKstDate());
  await page.locator('#tx-account').selectOption({ label: '생활비 통장' });
  await page.locator('#tx-category').fill('백업 전 거래');
  await page.locator('#tx-amount').fill('5000');
  await page.getByRole('button', { name: '거래 저장' }).click();
  await expect(page.getByText('백업 전 거래', { exact: true })).toBeVisible();

  await page.goto('/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '가계부 JSON 내보내기' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  await page.goto('/#/ledger');
  await page.locator('#tx-date').fill(await currentKstDate());
  await page.locator('#tx-account').selectOption({ label: '생활비 통장' });
  await page.locator('#tx-category').fill('백업 후 거래');
  await page.locator('#tx-amount').fill('7000');
  await page.getByRole('button', { name: '거래 저장' }).click();
  await expect(page.getByText('백업 후 거래', { exact: true })).toBeVisible();

  await page.goto('/#/settings');
  await page.getByLabel('가계부 JSON 백업 파일 선택').setInputFiles(downloadPath!);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('checkbox', { name: '기존 데이터를 모두 교체하는 것에 동의합니다.' }).check();
  await page.getByRole('button', { name: '가져오기 실행' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.goto('/#/ledger');
  await expect(page.getByText('백업 전 거래', { exact: true })).toBeVisible();
  await expect(page.getByText('백업 후 거래', { exact: true })).toHaveCount(0);
});

test('모바일 크기에서 메뉴·입력·가로 넘침을 확인한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: '빠른 메뉴' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('navigation', { name: '빠른 메뉴' }).getByRole('link', { name: '메모·할 일' }).click();
  await expect(page).toHaveURL(/#\/notes/);
  await page.getByRole('button', { name: '메모', exact: true }).click();
  await page.locator('#new-note-title-input').fill('모바일 입력 확인');
  await page.getByRole('button', { name: '메모 추가' }).click();
  await expect(page.locator('.note-title').filter({ hasText: '모바일 입력 확인' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '메뉴 열기' }).click();
  const drawer = page.getByRole('dialog', { name: '전체 메뉴' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('link', { name: '설정·백업' }).click();
  await expect(page).toHaveURL(/#\/settings/);
  await expectNoHorizontalOverflow(page);

  await page.goto('/#/ledger');
  await expectNoHorizontalOverflow(page);
  await page.goto('/#/apps');
  await expectNoHorizontalOverflow(page);
});

async function currentKstDate(): Promise<string> {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}


