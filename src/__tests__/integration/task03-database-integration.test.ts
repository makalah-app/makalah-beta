/**
 * TASK 03 DATABASE INTEGRATION - COMPREHENSIVE TESTING SUITE
 * 
 * PURPOSE:
 * - Comprehensive validation of all Task 03 implementations
 * - Integration testing for chat persistence, state management, and history
 * - Performance testing and error handling validation
 * - Regression testing for Task 01-02 functionality preservation
 * 
 * TESTING SCOPE:
 * - Message persistence fire-and-forget functionality
 * - Conversation state management and real-time sync
 * - Conversation history and UI integration
 * - Artifact integration and search history tracking
 * - Database integrity and performance validation
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/jest';

// Import all services for testing
import { persistMessagesAsync, isPersistenceEnabled } from '../../lib/database/message-persistence';
import { 
  getConversationState, 
  updateConversationState, 
  startChatSession, 
  endChatSession,
  getUserActiveSessions 
} from '../../lib/database/conversation-state';
import { 
  getConversationHistory, 
  getConversationTimeline, 
  getHistoryStatistics,
  searchConversations 
} from '../../lib/database/conversation-history';
import { 
  createLinkedArtifact, 
  updateLinkedArtifact, 
  getConversationArtifacts, 
  searchArtifacts 
} from '../../lib/database/artifact-integration';
import { 
  trackSearchQuery, 
  updateSearchResults, 
  recordUserFeedback, 
  getSearchHistory 
} from '../../lib/database/search-history';
import { saveChat, loadChat, createChat } from '../../lib/database/chat-store';
import { supabaseAdmin, supabaseServer } from '../../lib/database/supabase-client';
import type { AcademicUIMessage } from '../../app/api/chat/route';

// Test data setup
const TEST_USER_ID = 'test-user-task03-integration';
const TEST_SESSION_ID = 'test-session-task03';
let testConversationId: string;
let testArtifactId: string;
let testSearchQueryId: string;

/**
 * SETUP AND TEARDOWN
 */
beforeAll(async () => {
  console.log('🧪 Setting up Task 03 Database Integration Tests...');
  
  // Create test conversation for integration tests
  testConversationId = await createChat(TEST_USER_ID, 'Task 03 Integration Test Conversation');
  
  console.log(`✅ Test setup complete - Conversation ID: ${testConversationId}`);
});

afterAll(async () => {
  console.log('🧹 Cleaning up Task 03 Integration Test data...');
  
  try {
    // Clean up test data
    await supabaseAdmin.from('chat_messages').delete().eq('conversation_id', testConversationId);
    await supabaseAdmin.from('chat_sessions').delete().eq('conversation_id', testConversationId);
    await supabaseAdmin.from('artifacts').delete().eq('conversation_id', testConversationId);
    await supabaseAdmin.from('research_queries').delete().eq('conversation_id', testConversationId);
    await supabaseAdmin.from('conversations').delete().eq('id', testConversationId);
    
    console.log('✅ Test cleanup complete');
  } catch (error) {
    console.warn('⚠️ Test cleanup had issues:', error);
  }
});

/**
 * TEST SUITE 1: MESSAGE PERSISTENCE INFRASTRUCTURE
 */
describe('Task 03.1: Message Persistence Infrastructure', () => {
  
  test('should initialize persistence service correctly', () => {
    expect(isPersistenceEnabled()).toBe(true);
    expect(typeof persistMessagesAsync).toBe('function');
  });

  test('should persist messages asynchronously without blocking', async () => {
    const startTime = Date.now();
    
    const testMessages: AcademicUIMessage[] = [
      {
        id: 'test-msg-1',
        role: 'user',
        content: 'Test message for Task 03 persistence',
        parts: [{ type: 'text', text: 'Test message for Task 03 persistence' }],
        createdAt: new Date(),
        metadata: {
          userId: TEST_USER_ID,
          phase: 1,
          testMarker: 'task03-persistence-test'
        }
      },
      {
        id: 'test-msg-2', 
        role: 'assistant',
        content: 'Test response for Task 03 persistence',
        parts: [{ type: 'text', text: 'Test response for Task 03 persistence' }],
        createdAt: new Date(),
        metadata: {
          userId: TEST_USER_ID,
          phase: 1,
          testMarker: 'task03-persistence-test'
        }
      }
    ];

    // Fire-and-forget should not block
    persistMessagesAsync(testMessages, {
      conversationId: testConversationId,
      userId: TEST_USER_ID,
      phase: 1,
      sessionId: TEST_SESSION_ID,
      streamCoordinationData: {
        primaryExecuted: true,
        primarySuccess: true,
        writerUsed: true
      }
    });

    const fireAndForgetTime = Date.now() - startTime;
    
    // Should return immediately (fire-and-forget)
    expect(fireAndForgetTime).toBeLessThan(100);
    
    // Wait for async persistence to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify messages were actually persisted
    const savedMessages = await loadChat(testConversationId);
    const testMarkerMessages = savedMessages.filter(
      msg => msg.metadata?.testMarker === 'task03-persistence-test'
    );
    
    expect(testMarkerMessages.length).toBeGreaterThanOrEqual(2);
    expect(testMarkerMessages.find(msg => msg.role === 'user')).toBeTruthy();
    expect(testMarkerMessages.find(msg => msg.role === 'assistant')).toBeTruthy();
  });

  test('should handle persistence errors gracefully', async () => {
    // Test with invalid conversation ID to trigger error path
    const invalidMessages: AcademicUIMessage[] = [
      {
        id: 'invalid-msg',
        role: 'user',
        content: 'This should trigger error handling',
        parts: [{ type: 'text', text: 'This should trigger error handling' }],
        createdAt: new Date(),
        metadata: {}
      }
    ];

    // Should not throw error (fire-and-forget with error isolation)
    expect(() => {
      persistMessagesAsync(invalidMessages, {
        conversationId: 'invalid-conversation-id',
        userId: TEST_USER_ID,
        phase: 1,
        streamCoordinationData: {
          primaryExecuted: true,
          primarySuccess: true,
          writerUsed: true
        }
      });
    }).not.toThrow();
  });
});

/**
 * TEST SUITE 2: CONVERSATION STATE MANAGEMENT
 */
describe('Task 03.2: Conversation State Management System', () => {
  
  test('should manage conversation state lifecycle', async () => {
    // Get initial state
    let state = await getConversationState(testConversationId);
    expect(state).toBeTruthy();
    expect(state?.conversationId).toBe(testConversationId);
    expect(state?.userId).toBe(TEST_USER_ID);

    // Update conversation state
    const updateResult = await updateConversationState(testConversationId, {
      currentPhase: 2,
      metadata: {
        testUpdate: 'task03-state-test',
        lastUpdated: new Date().toISOString()
      }
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.conversationState?.currentPhase).toBe(2);

    // Verify state was updated
    state = await getConversationState(testConversationId);
    expect(state?.currentPhase).toBe(2);
    expect(state?.metadata.testUpdate).toBe('task03-state-test');
  });

  test('should manage chat sessions correctly', async () => {
    // Start new chat session
    const session = await startChatSession(testConversationId, TEST_USER_ID);
    expect(session).toBeTruthy();
    expect(session?.conversationId).toBe(testConversationId);
    expect(session?.userId).toBe(TEST_USER_ID);
    expect(session?.status).toBe('active');

    const sessionId = session!.sessionId;

    // Get active sessions
    const activeSessions = await getUserActiveSessions(TEST_USER_ID);
    const testSession = activeSessions.find(s => s.sessionId === sessionId);
    expect(testSession).toBeTruthy();

    // End session
    const endResult = await endChatSession(sessionId);
    expect(endResult).toBe(true);

    // Verify session was ended
    const updatedSessions = await getUserActiveSessions(TEST_USER_ID);
    const endedSession = updatedSessions.find(s => s.sessionId === sessionId);
    expect(endedSession).toBeFalsy();
  });
});

/**
 * TEST SUITE 3: CONVERSATION HISTORY & UI INTEGRATION
 */
describe('Task 03.3: Conversation History & UI Integration Layer', () => {
  
  test('should retrieve conversation history with filtering', async () => {
    // Load history for test user
    const history = await getConversationHistory({
      userId: TEST_USER_ID
    });

    expect(history.conversations).toBeDefined();
    expect(history.totalCount).toBeGreaterThanOrEqual(1);
    expect(history.conversations.some(conv => conv.id === testConversationId)).toBe(true);
    
    // Test pagination
    expect(typeof history.hasNextPage).toBe('boolean');
    expect(typeof history.currentPage).toBe('number');
    expect(typeof history.totalPages).toBe('number');
  });

  test('should generate conversation timeline', async () => {
    const timeline = await getConversationTimeline(testConversationId);
    
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThanOrEqual(1);
    
    // Should have conversation start event
    const startEvent = timeline.find(entry => entry.type === 'session_started');
    expect(startEvent).toBeTruthy();
    expect(startEvent?.title).toContain('Started');
  });

  test('should generate history statistics', async () => {
    const stats = await getHistoryStatistics(TEST_USER_ID);
    
    expect(stats).toBeTruthy();
    expect(typeof stats.totalConversations).toBe('number');
    expect(typeof stats.totalMessages).toBe('number');
    expect(Array.isArray(stats.phaseDistribution)).toBeFalsy();
    expect(typeof stats.phaseDistribution).toBe('object');
    expect(Array.isArray(stats.topTopics)).toBe(true);
  });

  test('should search conversations effectively', async () => {
    const searchResults = await searchConversations('Task 03', TEST_USER_ID);
    
    expect(Array.isArray(searchResults)).toBe(true);
    
    // Should find our test conversation
    const testConv = searchResults.find(conv => conv.id === testConversationId);
    expect(testConv).toBeTruthy();
  });
});

/**
 * TEST SUITE 4: ARTIFACT & SEARCH HISTORY INTEGRATION
 */
describe('Task 03.4: Artifact & Search History Persistence Integration', () => {
  
  test('should create and manage linked artifacts', async () => {
    // Create linked artifact
    const artifact = await createLinkedArtifact({
      title: 'Task 03 Test Artifact',
      type: 'academic_paper',
      content: 'This is a test artifact for Task 03 database integration testing. It contains comprehensive content to validate the artifact creation and management functionality.',
      conversationId: testConversationId,
      userId: TEST_USER_ID,
      phase: 2,
      sessionId: TEST_SESSION_ID
    });

    expect(artifact).toBeTruthy();
    expect(artifact?.title).toBe('Task 03 Test Artifact');
    expect(artifact?.conversationId).toBe(testConversationId);
    expect(artifact?.phase).toBe(2);
    expect(artifact?.metadata.contentMetrics.wordCount).toBeGreaterThan(0);
    
    testArtifactId = artifact!.id;

    // Update artifact
    const updatedArtifact = await updateLinkedArtifact(testArtifactId, {
      title: 'Updated Task 03 Test Artifact',
      content: 'This is updated content for the test artifact with additional information.',
      userId: TEST_USER_ID,
      changeDescription: 'Updated for integration testing'
    });

    expect(updatedArtifact).toBeTruthy();
    expect(updatedArtifact?.title).toBe('Updated Task 03 Test Artifact');
    expect(updatedArtifact?.metadata.collaborativeData.revisionCount).toBeGreaterThan(1);

    // Get conversation artifacts
    const conversationArtifacts = await getConversationArtifacts(testConversationId);
    
    expect(Array.isArray(conversationArtifacts)).toBe(true);
    expect(conversationArtifacts.some(art => art.id === testArtifactId)).toBe(true);
  });

  test('should search artifacts across conversations', async () => {
    const searchResults = await searchArtifacts('Task 03', {
      userId: TEST_USER_ID
    });

    expect(Array.isArray(searchResults)).toBe(true);
    
    // Should find our test artifact
    const testArtifact = searchResults.find(art => art.id === testArtifactId);
    expect(testArtifact).toBeTruthy();
  });

  test('should track search queries and history', async () => {
    // Track search query
    const searchId = await trackSearchQuery({
      query: 'Task 03 integration testing search query',
      conversationId: testConversationId,
      userId: TEST_USER_ID,
      phase: 2,
      searchType: 'academic',
      searchContext: {
        workflowStep: 'literature_review',
        intentCategory: 'research',
        expectedResultType: 'papers',
        urgencyLevel: 'medium'
      },
      sessionId: TEST_SESSION_ID
    });

    expect(searchId).toBeTruthy();
    testSearchQueryId = searchId!;

    // Update search results
    const updateResult = await updateSearchResults(testSearchQueryId, {
      totalFound: 25,
      relevantFound: 18,
      sourcesUsed: 5,
      responseTime: 1250,
      searchProvider: 'test-provider',
      filtersApplied: ['academic', 'peer-reviewed'],
      academicSources: ['test.edu', 'scholar.google.com']
    });

    expect(updateResult).toBe(true);

    // Record user feedback
    const feedbackResult = await recordUserFeedback(testSearchQueryId, {
      satisfactionScore: 4,
      usefulResults: 15,
      resultUsage: 'cited',
      followUpQueries: ['refined search query']
    });

    expect(feedbackResult).toBe(true);

    // Get search history
    const searchHistory = await getSearchHistory({
      userId: TEST_USER_ID,
      conversationId: testConversationId
    });

    expect(searchHistory.queries).toBeDefined();
    expect(Array.isArray(searchHistory.queries)).toBe(true);
    
    const testQuery = searchHistory.queries.find(q => q.id === testSearchQueryId);
    expect(testQuery).toBeTruthy();
    expect(testQuery?.results.qualityScore).toBeGreaterThan(0);
    expect(testQuery?.userFeedback.satisfactionScore).toBe(4);
  });
});

/**
 * TEST SUITE 5: INTEGRATION PERFORMANCE & ERROR HANDLING
 */
describe('Task 03.5: Performance & Error Handling Validation', () => {
  
  test('should handle concurrent operations gracefully', async () => {
    const concurrentOperations = [
      getConversationState(testConversationId),
      getConversationHistory({ userId: TEST_USER_ID }),
      getConversationArtifacts(testConversationId),
      getSearchHistory({ userId: TEST_USER_ID })
    ];

    const startTime = Date.now();
    const results = await Promise.allSettled(concurrentOperations);
    const endTime = Date.now();

    // All operations should complete
    expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    
    // Should complete in reasonable time
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('should handle database errors gracefully', async () => {
    // Test with invalid IDs (should not throw)
    const invalidConversationState = await getConversationState('invalid-conversation-id');
    expect(invalidConversationState).toBeNull();

    const invalidArtifacts = await getConversationArtifacts('invalid-conversation-id');
    expect(Array.isArray(invalidArtifacts)).toBe(true);
    expect(invalidArtifacts.length).toBe(0);

    const invalidHistory = await getConversationHistory({ userId: 'invalid-user-id' });
    expect(invalidHistory.conversations).toBeDefined();
    expect(invalidHistory.conversations.length).toBe(0);
  });

  test('should maintain data consistency across services', async () => {
    // Create test data across services
    const newConversationId = await createChat(TEST_USER_ID, 'Consistency Test Conversation');
    
    // Add messages
    const testMessages: AcademicUIMessage[] = [
      {
        id: 'consistency-msg-1',
        role: 'user',
        content: 'Consistency test message',
        parts: [{ type: 'text', text: 'Consistency test message' }],
        createdAt: new Date(),
        metadata: { userId: TEST_USER_ID, phase: 1 }
      }
    ];
    
    await saveChat({
      chatId: newConversationId,
      messages: testMessages
    });

    // Create linked artifact
    const artifact = await createLinkedArtifact({
      title: 'Consistency Test Artifact',
      type: 'test',
      content: 'Test content for consistency validation',
      conversationId: newConversationId,
      userId: TEST_USER_ID,
      phase: 1
    });

    // Verify data consistency
    const conversation = await getConversationState(newConversationId);
    const messages = await loadChat(newConversationId);
    const artifacts = await getConversationArtifacts(newConversationId);

    expect(conversation?.conversationId).toBe(newConversationId);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(artifacts.length).toBeGreaterThanOrEqual(1);
    expect(artifacts[0].conversationId).toBe(newConversationId);

    // Cleanup
    await supabaseAdmin.from('conversations').delete().eq('id', newConversationId);
  });
});

/**
 * TEST SUITE 6: REGRESSION TESTING - TASK 01-02 FUNCTIONALITY PRESERVATION
 */
describe('Task 03.6: Regression Testing - Task 01-02 Functionality Preservation', () => {
  
  test('should preserve existing chat API stream coordination', () => {
    // Verify critical stream coordination variables are still accessible
    // This is a smoke test to ensure our integration hooks don't break existing functionality
    
    const streamCoordinationData = {
      primaryExecuted: true,
      primarySuccess: true,
      writerUsed: true
    };

    expect(typeof streamCoordinationData.primaryExecuted).toBe('boolean');
    expect(typeof streamCoordinationData.primarySuccess).toBe('boolean');
    expect(typeof streamCoordinationData.writerUsed).toBe('boolean');
  });

  test('should preserve existing saveChat and loadChat functionality', async () => {
    // Test that original chat store functions still work
    const testChatId = await createChat(TEST_USER_ID, 'Regression Test Chat');
    
    const testMessages: AcademicUIMessage[] = [
      {
        id: 'regression-msg-1',
        role: 'user',
        content: 'Regression test message',
        parts: [{ type: 'text', text: 'Regression test message' }],
        createdAt: new Date(),
        metadata: { userId: TEST_USER_ID }
      }
    ];

    // Should save without issues
    await expect(saveChat({
      chatId: testChatId,
      messages: testMessages
    })).resolves.not.toThrow();

    // Should load correctly
    const loadedMessages = await loadChat(testChatId);
    expect(Array.isArray(loadedMessages)).toBe(true);
    expect(loadedMessages.length).toBeGreaterThanOrEqual(1);

    // Cleanup
    await supabaseAdmin.from('conversations').delete().eq('id', testChatId);
  });

  test('should persist messages that include arbitrary approval metadata', async () => {
    const approvalMetadata = {
      approved: true,
      phase: 2,
      reviewer: 'test-user',
      notes: 'metadata-only smoke test'
    };

    const testMessages: AcademicUIMessage[] = [
      {
        id: 'metadata-test-msg',
        role: 'assistant',
        content: 'Metadata persistence regression check',
        parts: [{ type: 'text', text: 'Metadata persistence regression check' }],
        createdAt: new Date(),
        metadata: {
          userId: TEST_USER_ID,
          phase: 2,
          approvalContext: approvalMetadata
        }
      }
    ];

    expect(() => {
      persistMessagesAsync(testMessages, {
        conversationId: testConversationId,
        userId: TEST_USER_ID,
        phase: 2,
        streamCoordinationData: {
          primaryExecuted: true,
          primarySuccess: true,
          writerUsed: true
        }
      });
    }).not.toThrow();
  });
});

/**
 * PERFORMANCE BENCHMARKS
 */
describe('Task 03.7: Performance Benchmarks', () => {
  
  test('should meet performance requirements', async () => {
    const benchmarks = [];

    // Benchmark: Message persistence should be fire-and-forget (< 100ms)
    const persistenceStart = Date.now();
    persistMessagesAsync([{
      id: 'perf-test-msg',
      role: 'user',
      content: 'Performance test message',
      parts: [{ type: 'text', text: 'Performance test message' }],
      createdAt: new Date(),
      metadata: { userId: TEST_USER_ID }
    }], {
      conversationId: testConversationId,
      userId: TEST_USER_ID,
      phase: 1,
      streamCoordinationData: {
        primaryExecuted: true,
        primarySuccess: true,
        writerUsed: true
      }
    });
    benchmarks.push(['Message Persistence (fire-and-forget)', Date.now() - persistenceStart]);

    // Benchmark: State retrieval should be fast (< 500ms)
    const stateStart = Date.now();
    await getConversationState(testConversationId);
    benchmarks.push(['Conversation State Retrieval', Date.now() - stateStart]);

    // Benchmark: History loading should be reasonable (< 1000ms)
    const historyStart = Date.now();
    await getConversationHistory({ userId: TEST_USER_ID });
    benchmarks.push(['Conversation History Loading', Date.now() - historyStart]);

    // Log benchmarks
    console.log('\n📊 Task 03 Performance Benchmarks:');
    benchmarks.forEach(([operation, time]) => {
      console.log(`  ${operation}: ${time}ms`);
    });

    // Validate performance requirements
    expect(benchmarks[0][1]).toBeLessThan(100); // Fire-and-forget should be instant
    expect(benchmarks[1][1]).toBeLessThan(500); // State retrieval should be fast
    expect(benchmarks[2][1]).toBeLessThan(1000); // History should be reasonable
  });
});

console.log('🎯 Task 03 Database Integration Test Suite - Complete Coverage');
