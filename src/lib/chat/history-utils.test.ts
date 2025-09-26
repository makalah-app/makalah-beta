import { jest } from '@jest/globals';
import { groupConversationsByDate, sortConversationsByActivity } from './history-utils';
import type { ConversationItem } from '../../hooks/useChatHistory';

describe('chat history utils', () => {
  const baseConversation: ConversationItem = {
    id: 'base',
    title: null,
    messageCount: 0,
    lastActivity: new Date().toISOString(),
    currentPhase: 1,
    workflowId: null,
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sorts conversations by last activity descending', () => {
    const conversations: ConversationItem[] = [
      { ...baseConversation, id: 'c1', lastActivity: '2024-09-14T10:00:00Z' },
      { ...baseConversation, id: 'c2', lastActivity: '2024-09-15T11:00:00Z' },
      { ...baseConversation, id: 'c3', lastActivity: '2024-09-13T09:00:00Z' },
    ];

    const sorted = sortConversationsByActivity(conversations);

    expect(sorted.map((c) => c.id)).toEqual(['c2', 'c1', 'c3']);
  });

  it('groups conversations into human-friendly buckets', () => {
    const now = new Date('2024-09-16T08:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const unsorted: ConversationItem[] = [
      { ...baseConversation, id: 'older', lastActivity: '2024-08-30T10:00:00Z' },
      { ...baseConversation, id: 'invalid', lastActivity: 'not-a-date' },
      { ...baseConversation, id: 'this-week', lastActivity: '2024-09-12T09:00:00Z' },
      { ...baseConversation, id: 'yesterday', lastActivity: '2024-09-15T12:00:00Z' },
      { ...baseConversation, id: 'today', lastActivity: '2024-09-16T07:00:00Z' },
    ];

    const sorted = sortConversationsByActivity(unsorted);
    const grouped = groupConversationsByDate(sorted);

    expect(grouped['Hari Ini'].map((c) => c.id)).toEqual(['today']);
    expect(grouped['Kemarin'].map((c) => c.id)).toEqual(['yesterday']);
    expect(grouped['Minggu Ini'].map((c) => c.id)).toEqual(['this-week']);
    expect(grouped['Lebih Lama'].map((c) => c.id)).toEqual(['older', 'invalid']);
  });
});
