import { test, expect } from '@playwright/test';

/**
 * Workflow Progress E2E Tests
 *
 * NOTE: These tests require Playwright to be properly configured and a running dev server.
 * Run with: npx playwright test tests/e2e/workflow.spec.ts
 *
 * Prerequisites:
 * - Dev server running on http://localhost:3000
 * - User authenticated (or use test mode)
 */

test.describe('Workflow Progress E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat page
    await page.goto('http://localhost:3000/chat');

    // Wait for page to load
    // Note: This selector needs to be updated based on actual ChatContainer structure
    await page.waitForLoadState('networkidle');
  });

  test('should display workflow progress sidebar on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Sidebar should be visible
    const sidebar = page.locator('[data-testid="workflow-progress"]');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Should show header text
    await expect(page.locator('text=Progress Paper')).toBeVisible();
  });

  test('should hide workflow sidebar on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Sidebar should be hidden (lg:block means hidden on mobile)
    const sidebar = page.locator('[data-testid="workflow-progress"]');
    await expect(sidebar).not.toBeVisible();
  });

  test('should show milestone cards', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Wait for sidebar to be visible
    await page.waitForSelector('[data-testid="workflow-progress"]', { timeout: 5000 });

    // Should show all 10 milestone cards
    const milestoneCards = page.locator('[data-testid="milestone-card"]');
    const count = await milestoneCards.count();

    expect(count).toBe(10);
  });

  test('should highlight active milestone', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Wait for sidebar
    await page.waitForSelector('[data-testid="workflow-progress"]', { timeout: 5000 });

    // Find active milestone card (should have "Aktif" badge)
    const activeBadge = page.locator('text=Aktif');
    await expect(activeBadge).toBeVisible();
  });

  test('should display progress percentage', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Wait for sidebar
    await page.waitForSelector('[data-testid="workflow-progress"]', { timeout: 5000 });

    // Progress percentage should be visible
    const progressText = page.locator('[data-testid="progress-percentage"]');
    await expect(progressText).toBeVisible();

    // Should show a percentage (e.g., "5%", "20%", etc.)
    const text = await progressText.textContent();
    expect(text).toMatch(/\d+%/);
  });

  // TODO: Add test for progress updates after AI response
  // Requires mocking or test mode with predictable AI responses
  test.skip('should update progress after AI response', async ({ page }) => {
    // Type message
    // Wait for AI response
    // Check if progress updated
  });
});
