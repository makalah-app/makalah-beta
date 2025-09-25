import { test, expect } from '@playwright/test';

/**
 * Validasi toggle tema global di halaman beranda.
 * - Default harus light (class html mengandung 'light') karena root layout set defaultTheme="light".
 * - Setelah toggle, class harus berganti ke 'dark'.
 * - Toggle lagi harus kembali ke 'light'.
 */

test.describe('Theme toggle', () => {
  test('should switch between light and dark modes on home page', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveClass(/light/, { timeout: 5000 });

    const toggle = page.locator('button.header-theme-toggle');
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(html).toHaveClass(/dark/, { timeout: 5000 });

    await toggle.click();
    await expect(html).toHaveClass(/light/, { timeout: 5000 });
  });
});
