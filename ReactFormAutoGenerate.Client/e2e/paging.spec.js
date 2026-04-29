import { test, expect } from '@playwright/test';

const listPages = [
  { name: 'REST List', url: '/rest-list-example' },
  { name: 'REST Keyless List', url: '/rest-keyless-example' },
  { name: 'GraphQL List', url: '/graphql-list-example' },
  { name: 'GraphQL Keyless List', url: '/graphql-keyless-example' },
];

for (const listPage of listPages) {
  test.describe(`Pagination - ${listPage.name}`, () => {
    test.beforeEach(async ({ page }) => {
      page.on('console', msg => console.log(`BROWSER [${listPage.name}]: ${msg.text()}`));
      page.on('requestfailed', request => console.log(`REQUEST FAILED [${listPage.name}]: ${request.url()} - ${request.failure()?.errorText}`));
      page.on('response', response => {
          if (response.status() >= 400) {
              console.log(`RESPONSE ERROR [${listPage.name}]: ${response.url()} - Status ${response.status()}`);
          }
      });
      test.setTimeout(90000);
      await page.goto(listPage.url);
      await page.waitForLoadState('networkidle');
      
      // Wait for the grid/listview to appear
      const listview = page.locator('.k-listview, .autolist-row').first();
      await expect(listview).toBeVisible({ timeout: 30000 });
    });

    test('should navigate through pages', async ({ page }) => {
      const pager = page.locator('.k-pager');
      await expect(pager).toBeVisible({ timeout: 15000 });

      // Get initial first item text
      const firstItem = page.locator('.autolist-row').first();
      await expect(firstItem).toBeVisible();
      const initialText = await firstItem.innerText();

      // Click next page - more robust selector for Kendo Next Page button
      // Use the button with aria-label="Go to the next page"
      const nextBtn = page.getByRole('button', { name: /next page/i }).or(page.locator('.k-pager-nav.k-pager-next'));
      await nextBtn.first().click();
      
      // Wait for data to update (initial text should disappear or change)
      await expect(page.locator('.autolist-row').first()).not.toHaveText(initialText, { timeout: 15000 });
    });

    test('should change page size', async ({ page }) => {
      // Find page size dropdown
      const kendoDropdown = page.locator('.k-pager-sizes .k-dropdownlist');
      
      if (await kendoDropdown.isVisible()) {
        await kendoDropdown.click();
        // Wait for the popup and select 20
        // Use a more specific selector to avoid hitting other popups
        const option = page.locator('.k-animation-container:visible .k-list-item').filter({ hasText: /^20$/ }).first();
        await option.click();
      } else {
        const select = page.locator('.k-pager-sizes select');
        if (await select.isVisible()) {
            await select.selectOption('20');
        }
      }
      
      // Wait for data to refresh - expect 20 rows
      const rows = page.locator('.autolist-row');
      await expect(rows).toHaveCount(20, { timeout: 15000 });
    });
  });
}
