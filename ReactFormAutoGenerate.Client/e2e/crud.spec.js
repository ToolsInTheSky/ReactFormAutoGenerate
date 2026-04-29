import { test, expect } from '@playwright/test';

const pages = [
  { name: 'REST RJSF', url: '/rest-rjsf-example' },
  { name: 'REST Uniform', url: '/rest-uniform-example' },
  { name: 'GraphQL RJSF', url: '/graphql-rjsf-example' },
  { name: 'GraphQL Uniform', url: '/graphql-uniform-example' },
];

for (const pageInfo of pages) {
  test.describe(`CRUD - ${pageInfo.name}`, () => {
    test.beforeEach(async ({ page }) => {
      // Increase timeout for initial load/compile
      test.setTimeout(90000);
      await page.goto(pageInfo.url);
      
      // Initial wait for Vite/React hydration
      await page.waitForTimeout(5000);

      // Wait for grid or listview to appear
      await page.waitForSelector('.k-grid, .k-listview, .autolist-row, .k-loading-proxy', { state: 'attached', timeout: 30000 });
    });

    test('should create, edit and delete an item', async ({ page }) => {
      // 1. Create
      // Find the "Create New" or "Create" button
      const createBtn = page.locator('button:has-text("Create")').first();
      await createBtn.click();

      // Wait for form
      await page.waitForSelector('form, .k-form', { timeout: 10000 });

      // Robust name input selector
      const nameInput = page.locator('input[name*="name"], input[name*="Name"], .k-textbox input, #root_name, [id*="name"]').first();
      const testName = `E2E Test ${Date.now()}`;
      
      // Try getByLabel first as it's more robust
      const nameByLabel = page.getByLabel(/Name/i).first();
      if (await nameByLabel.isVisible()) {
        await nameByLabel.fill(testName);
      } else {
        await nameInput.fill(testName);
      }

      // If it's a product, fill Price
      const priceInput = page.locator('input[name*="price"], input[name*="Price"], input[type="number"], #root_price').first();
      if (await priceInput.isVisible()) {
        await priceInput.fill('99');
      }

      // Find and click Save
      const saveBtn = page.locator('button:has-text("Save"), button.k-button-primary').first();
      await saveBtn.click();

      // Verify success notification (Refine/Kendo)
      await expect(page.locator('.k-notification, :text("successfully")').first()).toBeVisible({ timeout: 15000 });
      
      // 2. Edit
      // Wait for grid to refresh and find the new item
      await page.waitForTimeout(2000); 
      const newRow = page.getByText(testName).first();
      await newRow.scrollIntoViewIfNeeded();
      await newRow.click();

      // Edit name
      const updatedName = `${testName} Updated`;
      if (await nameByLabel.isVisible()) {
        await nameByLabel.fill(updatedName);
      } else {
        await nameInput.fill(updatedName);
      }
      
      const saveBtnEdit = page.locator('button:has-text("Save")').first();
      await saveBtnEdit.click();
      await expect(page.locator('.k-notification, :text("successfully")').first()).toBeVisible();

      // 3. Delete
      await page.waitForTimeout(2000);
      const updatedRow = page.getByText(updatedName).first();
      await updatedRow.scrollIntoViewIfNeeded();
      await updatedRow.click();
      
      // Handle confirm dialog
      page.on('dialog', dialog => dialog.accept());
      
      const deleteBtn = page.locator('button:has-text("Delete")').first();
      await deleteBtn.click();
      
      await expect(page.locator('.k-notification, :text("successfully")').first()).toBeVisible();
      await expect(page.getByText(updatedName)).not.toBeVisible();
    });
  });
}
