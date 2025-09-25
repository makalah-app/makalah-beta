/**
 * END-TO-END WORKFLOW TESTS - Playwright Testing Suite
 * 
 * Tests complete user journey dari browser interaction → artifact generation → display
 * ensuring 100% success rate untuk real user scenarios dan production readiness.
 * 
 * Critical Success Criteria:
 * - Complete Browser Flow: User types "cukup" → approval gate → artifact appears
 * - Multiple Device Support: Desktop, mobile, tablet compatibility
 * - Accessibility: Screen reader, keyboard navigation compliance
 * - Performance: All operations within production benchmarks
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  TIMEOUT: {
    NAVIGATION: 30000,
    RESPONSE: 10000,
    ARTIFACT_GENERATION: 5000,
  },
  PERFORMANCE: {
    MAX_LOAD_TIME: 3000,
    MAX_CHAT_RESPONSE: 2000,
    MAX_ARTIFACT_DISPLAY: 500,
  },
};

// Page Object Model untuk better maintainability
class ChatPageObject {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly messagesContainer: Locator;
  readonly approvalGates: Locator;
  readonly artifacts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatInput = page.locator('[data-testid="chat-input"], input[type="text"], textarea');
    this.sendButton = page.locator('[data-testid="send-button"], button[type="submit"]');
    this.messagesContainer = page.locator('[data-testid="messages-container"], .messages, .chat-messages');
    this.approvalGates = page.locator('[data-testid="approval-gate"], .approval-gate');
    this.artifacts = page.locator('[data-testid="artifact"], .artifact-card, .inline-artifacts-container');
  }

  async sendMessage(message: string) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }

  async waitForResponse(timeout = TEST_CONFIG.TIMEOUT.RESPONSE) {
    await this.page.waitForTimeout(1000); // Allow message to be sent
    await this.page.waitForFunction(
      () => {
        const messages = document.querySelectorAll('[role="assistant"], .message-assistant');
        return messages.length > 0;
      },
      { timeout }
    );
  }

  async waitForApprovalGate(timeout = TEST_CONFIG.TIMEOUT.RESPONSE) {
    await this.approvalGates.first().waitFor({ state: 'visible', timeout });
  }

  async approvePhase() {
    const approveButton = this.page.locator('button:has-text("Approve"), button:has-text("Setuju"), [data-testid="approve-button"]');
    await approveButton.click();
  }

  async waitForArtifacts(timeout = TEST_CONFIG.TIMEOUT.ARTIFACT_GENERATION) {
    await this.artifacts.first().waitFor({ state: 'visible', timeout });
  }
}

// Test data dan scenarios
const ACADEMIC_CONVERSATION_SCENARIOS = [
  {
    name: 'Topic Definition Phase',
    phase: 1,
    conversation: [
      'Saya ingin menulis makalah tentang machine learning dalam healthcare',
      'Fokus pada diagnostic tools dan implementasi klinisnya',
      'Research questions tentang akurasi dan tantangan implementasi',
    ],
    completionSignal: 'cukup untuk definisi topik',
    expectedArtifact: 'Research Topic Definition - Phase 1 Complete',
  },
  {
    name: 'Literature Review Phase',
    phase: 2,
    conversation: [
      'Saya sudah kumpulkan 25 paper tentang ML diagnostic tools',
      'Tema utama: CNN untuk medical imaging, NLP untuk EHR, ethical considerations',
      'Ada gap dalam research tentang long-term clinical outcomes',
    ],
    completionSignal: 'review literatur sudah lengkap',
    expectedArtifact: 'Literature Review Summary - Phase 2 Complete',
  },
];

test.beforeEach(async ({ page }) => {
  // Navigate to chat page
  await page.goto('/');
  
  // Wait for application to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Verify chat interface is available
  const chatPage = new ChatPageObject(page);
  await expect(chatPage.chatInput).toBeVisible();
});

test.describe('Complete Workflow - Desktop', () => {

  test('should complete full artifact generation workflow untuk Phase 1', async ({ page }) => {
    const chatPage = new ChatPageObject(page);
    const scenario = ACADEMIC_CONVERSATION_SCENARIOS[0];

    // Step 1: Start academic conversation
    for (const message of scenario.conversation) {
      await chatPage.sendMessage(message);
      await chatPage.waitForResponse();
    }

    // Step 2: Send completion signal
    const startTime = Date.now();
    await chatPage.sendMessage(scenario.completionSignal);
    
    // Step 3: Wait for approval gate to appear
    await chatPage.waitForApprovalGate();
    
    // Verify approval gate is properly displayed
    await expect(chatPage.approvalGates).toBeVisible();
    const approvalGateText = await chatPage.approvalGates.first().textContent();
    expect(approvalGateText).toContain('Phase');
    expect(approvalGateText).toContain('approval');

    // Step 4: Approve the phase
    await chatPage.approvePhase();

    // Step 5: Wait for artifact to be generated and displayed
    await chatPage.waitForArtifacts();

    // Step 6: Verify artifact content
    await expect(chatPage.artifacts).toBeVisible();
    const artifactContent = await chatPage.artifacts.first().textContent();
    expect(artifactContent).toContain(scenario.expectedArtifact);
    expect(artifactContent).toContain('machine learning');
    expect(artifactContent).toContain('healthcare');

    // Step 7: Performance verification
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(TEST_CONFIG.PERFORMANCE.MAX_CHAT_RESPONSE + TEST_CONFIG.TIMEOUT.ARTIFACT_GENERATION);

    // Step 8: Verify PDF export functionality
    const downloadPromise = page.waitForEvent('download');
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Download")').first();
    
    if (await pdfButton.isVisible()) {
      await pdfButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }
  });

  test('should handle revision requests correctly', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Start conversation and trigger approval gate
    await chatPage.sendMessage('Topik penelitian tentang AI dalam pendidikan');
    await chatPage.waitForResponse();
    
    await chatPage.sendMessage('cukup untuk topik ini');
    await chatPage.waitForApprovalGate();

    // Request revision instead of approval
    const revisionButton = page.locator('button:has-text("Revision"), button:has-text("Revisi")');
    
    if (await revisionButton.isVisible()) {
      await revisionButton.click();
      
      // Fill revision feedback
      const feedbackInput = page.locator('textarea, input[type="text"]').last();
      await feedbackInput.fill('Tolong tambahkan detail tentang metodologi penelitian');
      
      const submitRevision = page.locator('button:has-text("Submit"), button:has-text("Kirim")');
      await submitRevision.click();

      // Verify revision response
      await chatPage.waitForResponse();
      const lastMessage = page.locator('.message').last();
      const messageText = await lastMessage.textContent();
      expect(messageText).toContain('revision');
      expect(messageText).toContain('metodologi');
    }
  });

  test('should handle multiple phases in sequence', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    for (let i = 0; i < 2; i++) { // Test first 2 phases
      const scenario = ACADEMIC_CONVERSATION_SCENARIOS[i];
      
      // Conduct conversation untuk each phase
      for (const message of scenario.conversation) {
        await chatPage.sendMessage(message);
        await chatPage.waitForResponse();
      }

      // Complete phase
      await chatPage.sendMessage(scenario.completionSignal);
      await chatPage.waitForApprovalGate();
      await chatPage.approvePhase();
      await chatPage.waitForArtifacts();

      // Verify phase-specific artifact
      const artifacts = await chatPage.artifacts.all();
      const lastArtifact = artifacts[artifacts.length - 1];
      const artifactText = await lastArtifact.textContent();
      expect(artifactText).toContain(`Phase ${scenario.phase} Complete`);
    }

    // Verify multiple artifacts are displayed
    const allArtifacts = await chatPage.artifacts.all();
    expect(allArtifacts.length).toBeGreaterThanOrEqual(2);
  });

});

test.describe('Mobile Compatibility', () => {

  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE dimensions

  test('should work correctly on mobile devices', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Test mobile-specific interactions
    await chatPage.sendMessage('Mobile test: topik AI dalam kesehatan');
    await chatPage.waitForResponse();

    await chatPage.sendMessage('cukup');
    await chatPage.waitForApprovalGate();

    // Verify approval gate is mobile-friendly
    const approvalGate = chatPage.approvalGates.first();
    await expect(approvalGate).toBeVisible();
    
    // Check touch interactions
    await chatPage.approvePhase();
    await chatPage.waitForArtifacts();

    // Verify artifact display is responsive
    const artifact = chatPage.artifacts.first();
    await expect(artifact).toBeVisible();
    
    // Check artifact is properly sized untuk mobile
    const boundingBox = await artifact.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375); // Fits within mobile viewport
  });

});

test.describe('Accessibility Testing', () => {

  test('should be accessible untuk screen readers', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Test keyboard navigation
    await chatPage.sendMessage('Accessibility test conversation');
    await page.keyboard.press('Tab'); // Navigate dengan keyboard
    
    await chatPage.waitForResponse();
    
    await chatPage.sendMessage('selesai untuk fase ini');
    await chatPage.waitForApprovalGate();

    // Test approval gate accessibility
    const approvalGate = chatPage.approvalGates.first();
    await expect(approvalGate).toHaveAttribute('role'); // Should have proper ARIA role
    
    // Test keyboard approval
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Approve via keyboard
    
    await chatPage.waitForArtifacts();
    
    // Verify artifact has proper accessibility attributes
    const artifact = chatPage.artifacts.first();
    await expect(artifact).toBeVisible();
    
    // Check for alt text, labels, etc.
    const artifactElements = await artifact.locator('*').all();
    for (const element of artifactElements.slice(0, 5)) { // Check first few elements
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'img') {
        await expect(element).toHaveAttribute('alt');
      }
      
      if (tagName === 'button') {
        const hasLabel = await element.evaluate(el => 
          el.getAttribute('aria-label') || 
          el.getAttribute('title') || 
          el.textContent?.trim()
        );
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('should have proper focus management', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Start conversation
    await chatPage.sendMessage('Focus management test');
    await chatPage.waitForResponse();

    // Test focus preservation during workflow
    await chatPage.chatInput.focus();
    await expect(chatPage.chatInput).toBeFocused();

    await chatPage.sendMessage('cukup untuk test ini');
    await chatPage.waitForApprovalGate();

    // Focus should be managed properly during approval flow
    const firstButton = page.locator('button').first();
    await firstButton.focus();
    await expect(firstButton).toBeFocused();
  });

});

test.describe('Error Handling dan Edge Cases', () => {

  test('should handle network failures gracefully', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Simulate network conditions
    await page.route('**/api/**', route => {
      if (Math.random() < 0.3) { // 30% failure rate
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Attempt normal workflow
    await chatPage.sendMessage('Test dengan network issues');
    
    // Should show error handling atau retry mechanisms
    const errorMessage = page.locator('.error, .warning, [data-testid="error"]');
    const successMessage = page.locator('.message').last();

    // Either error handling is shown or message succeeds
    await Promise.race([
      expect(errorMessage).toBeVisible({ timeout: 5000 }),
      expect(successMessage).toBeVisible({ timeout: 5000 }),
    ]);
  });

  test('should handle very long conversations', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Send many messages to test performance dengan large conversation
    for (let i = 0; i < 10; i++) {
      await chatPage.sendMessage(`Message ${i + 1}: Testing conversation length and memory management`);
      await page.waitForTimeout(100); // Small delay between messages
    }

    await chatPage.waitForResponse();

    // Final completion signal
    await chatPage.sendMessage('selesai dengan conversation panjang ini');
    await chatPage.waitForApprovalGate();
    await chatPage.approvePhase();
    await chatPage.waitForArtifacts();

    // Verify artifact generation still works dengan long conversation
    await expect(chatPage.artifacts).toBeVisible();
  });

});

test.describe('Performance Benchmarks', () => {

  test('should meet all performance requirements', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Test 1: Page load performance
    const navigationStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - navigationStart;
    
    expect(loadTime).toBeLessThan(TEST_CONFIG.PERFORMANCE.MAX_LOAD_TIME);

    // Test 2: Chat response performance
    const chatStart = Date.now();
    await chatPage.sendMessage('Performance test message');
    await chatPage.waitForResponse();
    const chatTime = Date.now() - chatStart;
    
    expect(chatTime).toBeLessThan(TEST_CONFIG.PERFORMANCE.MAX_CHAT_RESPONSE);

    // Test 3: Artifact generation performance
    await chatPage.sendMessage('cukup untuk performance test');
    await chatPage.waitForApprovalGate();
    
    const artifactStart = Date.now();
    await chatPage.approvePhase();
    await chatPage.waitForArtifacts();
    const artifactTime = Date.now() - artifactStart;
    
    expect(artifactTime).toBeLessThan(TEST_CONFIG.TIMEOUT.ARTIFACT_GENERATION);

    // Test 4: Artifact display performance
    const displayStart = Date.now();
    await expect(chatPage.artifacts.first()).toBeVisible();
    const displayTime = Date.now() - displayStart;
    
    expect(displayTime).toBeLessThan(TEST_CONFIG.PERFORMANCE.MAX_ARTIFACT_DISPLAY);
  });

  test('should handle concurrent users (simulation)', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Each "user" performs the workflow simultaneously
    const workflowPromises = pages.map(async (page, index) => {
      const chatPage = new ChatPageObject(page);
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await chatPage.sendMessage(`Concurrent user ${index + 1} test`);
      await chatPage.waitForResponse();
      
      await chatPage.sendMessage('cukup');
      await chatPage.waitForApprovalGate();
      await chatPage.approvePhase();
      await chatPage.waitForArtifacts();
      
      return true;
    });

    // All workflows should complete successfully
    const results = await Promise.all(workflowPromises);
    expect(results.every(result => result === true)).toBe(true);

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

});

/**
 * PRODUCTION READINESS TESTS
 * Final validation untuk deployment readiness
 */
test.describe('Production Readiness Validation', () => {

  test('should pass complete user acceptance criteria', async ({ page }) => {
    const chatPage = new ChatPageObject(page);

    // Complete realistic user journey
    const userJourney = [
      'Saya ingin menulis makalah tentang aplikasi deep learning untuk analisis citra medis',
      'Fokus pada deteksi kanker dalam radiologi dengan menggunakan CNN',
      'Metodologi systematic review dengan analisis komparatif berbagai arsitektur',
      'Research questions: tingkat akurasi, efisiensi komputasi, dan implementasi klinis',
    ];

    // Conduct realistic conversation
    for (const message of userJourney) {
      await chatPage.sendMessage(message);
      await chatPage.waitForResponse();
    }

    // Natural completion
    await chatPage.sendMessage('sudah cukup lengkap untuk definisi topik penelitian ini');
    
    // Approval workflow
    await chatPage.waitForApprovalGate();
    await expect(chatPage.approvalGates).toBeVisible();
    await chatPage.approvePhase();

    // Artifact generation dan display
    await chatPage.waitForArtifacts();
    const artifact = chatPage.artifacts.first();
    await expect(artifact).toBeVisible();
    
    // Verify artifact quality dan completeness
    const artifactText = await artifact.textContent();
    expect(artifactText).toContain('Research Topic Definition');
    expect(artifactText).toContain('deep learning');
    expect(artifactText).toContain('citra medis');
    expect(artifactText).toContain('CNN');
    expect(artifactText).toContain('Phase 1 Approved');
    
    // Verify professional quality output
    expect(artifactText.length).toBeGreaterThan(500); // Substantial content
    expect(artifactText).toMatch(/Generated on \d/); // Timestamp
    expect(artifactText).not.toContain('undefined'); // No rendering errors
    expect(artifactText).not.toContain('null'); // No null values
  });

});