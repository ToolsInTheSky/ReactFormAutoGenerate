import { test, expect } from '@playwright/test';

const listPages = [
  { name: 'REST List', url: '/rest-list-example' },
  { name: 'GraphQL List', url: '/graphql-list-example' },
];

for (const listPage of listPages) {
  test.describe(`Pagination - ${listPage.name}`, () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(90000);
      await page.goto(listPage.url);
      await page.waitForTimeout(5000);
      await page.waitForSelector('.k-listview, .autolist-row', { timeout: 30000 });
    });

    test('should navigate through pages', async ({ page }) => {
      const pager = page.locator('.k-pager');
      await expect(pager).toBeVisible({ timeout: 15000 });

      // Get initial first item text
      const firstItem = page.locator('.autolist-row').first();
      await expect(firstItem).toBeVisible();
      const initialText = await firstItem.innerText();

      // Click next page - more robust selector for Kendo Next Page button
      const nextBtn = page.locator('.k-pager-nav').filter({ has: page.locator('.k-i-caret-alt-right, .k-svg-i-caret-alt-right') }).or(page.locator('.k-pager-next'));
      await nextBtn.first().click();
      
      await page.waitForTimeout(2000);

      // Verify item changed
      const nextPageItem = page.locator('.autolist-row').first();
      await expect(nextPageItem).not.toHaveText(initialText, { timeout: 10000 });
    });

    test('should change page size', async ({ page }) => {
      // Find page size dropdown
      const select = page.locator('.k-pager-sizes select');
      const kendoDropdown = page.locator('.k-pager-sizes .k-dropdownlist');
      
      if (await select.count() > 0) {
        await select.selectOption('20');
      } else if (await kendoDropdown.count() > 0) {
        // Kendo DropDownList replacement for native select
        await kendoDropdown.click();
        await page.locator('.k-list-item:has-text("20")').click();
      }
      
      await page.waitForTimeout(2000);

      // Verify more items are shown
      const rows = page.locator('.autolist-row');
      const count = await rows.count();
      // We seeded 50/150 items, so changing to 20 should show more than 10
      expect(count).toBeGreaterThan(10);
    });
  });
}
