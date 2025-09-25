/**
 * HITL Approval Flow E2E - Phases 1 to 3
 *
 * Steps:
 * - Login admin → navigate to /chat
 * - Phase 1: ≥10 exchanges, trigger intuitive approval, approve, verify artifact, verify Phase 2/7
 * - Phase 2: same flow, verify web search (URLs + Sources), approve, verify Phase 3/7
 * - Phase 3: same flow, approve, verify artifact
 */

import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'makalah.app@gmail.com';
const ADMIN_PASSWORD = 'M4k4l4h2025';

async function loginAsAdmin(page) {
  await page.goto('/auth');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]:has-text("Masuk")');
  // Redirect happens to /chat by default
  await page.waitForURL('**/chat', { timeout: 30000 });
}

async function sendChatMessage(page, text: string) {
  const textarea = page.locator('textarea');
  await expect(textarea).toBeVisible();
  await textarea.fill(text);
  await textarea.press('Enter');
}

async function waitForAssistantResponse(page) {
  // Fallback: wait for any message rendering or streaming stop
  await page.waitForTimeout(1200);
}

async function performPhaseDiscussion(page, phase: number, exchanges: number) {
  for (let i = 0; i < exchanges; i++) {
    await sendChatMessage(page, `Diskusi fase ${phase} - iterasi ${i + 1}: jelaskan aspek detail yang relevan.`);
    await waitForAssistantResponse(page);
  }
}

async function triggerApprovalIntuitively(page, phase: number) {
  // Natural intent signal without explicit "setuju"
  await sendChatMessage(
    page,
    `Menurut gue pembahasan fase ${phase} sudah cukup komprehensif dan memadai, kita bisa lanjut ke fase berikutnya.`
  );
  // Wait the assistant to present approval gate UI (tool UI)
  await page.waitForSelector(`.phase-approval-gate, [data-testid="approve-phase-${phase}"]`, { timeout: 30000 });
}

async function approveCurrentPhase(page, phase: number) {
  // Prefer data-testid button if present, fallback by text
  const approveBtn = page.locator(`[data-testid="approve-phase-${phase}"]`);
  if (await approveBtn.first().isVisible().catch(() => false)) {
    await approveBtn.first().click();
  } else {
    await page.click(`button:has-text("Setujui Fase ${phase}")`);
  }
}

async function expectArtifactForPhase(page, phase: number) {
  // Artifact content includes "Phase X Approved" footer text
  await expect(page.locator(`text=Phase ${phase} Approved`)).toBeVisible({ timeout: 30000 });
}

async function expectPhaseIndicator(page, expected: string) {
  // Progress bar text uses "Phase {current}/{total}" somewhere in the UI
  await expect(page.locator(`text=${expected}`)).toBeVisible({ timeout: 10000 });
}

async function verifyWebSearchSources(page) {
  // Sources section will appear with anchor links when web search returns citations
  const sourcesHeader = page.locator('text=Sources');
  await expect(sourcesHeader).toBeVisible({ timeout: 30000 });
  const firstLink = page.locator('a[href^="http"]');
  await expect(firstLink.first()).toBeVisible();
}

test.describe('HITL Approval Flow (Phases 1→3)', () => {
  test('Login → Phase 1, 2, 3 flow with web search verification', async ({ page }) => {
    // 1) Login
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/chat$/);

    // 2) Phase 1: 10 exchanges
    await performPhaseDiscussion(page, 1, 10);
    await triggerApprovalIntuitively(page, 1);
    await approveCurrentPhase(page, 1);
    await expectArtifactForPhase(page, 1);

    // Phase indicator should show Phase 2/7
    await expectPhaseIndicator(page, 'Phase 2/7');

    // Announcement may or may not be rendered as text; we check indicator as ground truth

    // 3) Phase 2: 10 exchanges + verify web search sources
    await performPhaseDiscussion(page, 2, 10);
    // Web search should be active in phase 2, verify sources present
    await verifyWebSearchSources(page);
    await triggerApprovalIntuitively(page, 2);
    await approveCurrentPhase(page, 2);
    await expectArtifactForPhase(page, 2);

    // Phase indicator should show Phase 3/7
    await expectPhaseIndicator(page, 'Phase 3/7');

    // 4) Phase 3: 10 exchanges, approve, verify artifact
    await performPhaseDiscussion(page, 3, 10);
    await triggerApprovalIntuitively(page, 3);
    await approveCurrentPhase(page, 3);
    await expectArtifactForPhase(page, 3);
  });
});

