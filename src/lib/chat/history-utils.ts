import type { ConversationItem } from '../../hooks/useChatHistory';

/**
 * Return a new array sorted by most recent activity.
 */
export function sortConversationsByActivity(conversations: ConversationItem[]): ConversationItem[] {
  return [...conversations].sort((a, b) => {
    const aTime = a?.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const bTime = b?.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    return bTime - aTime;
  });
}

const GROUP_LABELS = {
  today: 'Hari Ini',
  yesterday: 'Kemarin',
  thisWeek: 'Minggu Ini',
  older: 'Lebih Lama',
} as const;

export type ConversationGroups = Record<(typeof GROUP_LABELS)[keyof typeof GROUP_LABELS], ConversationItem[]>;

/**
 * Group conversations into UI buckets based on the last activity timestamp.
 */
export function groupConversationsByDate(conversations: ConversationItem[]): ConversationGroups {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const groups: ConversationGroups = {
    [GROUP_LABELS.today]: [],
    [GROUP_LABELS.yesterday]: [],
    [GROUP_LABELS.thisWeek]: [],
    [GROUP_LABELS.older]: [],
  };

  conversations.forEach((conversation) => {
    const lastActivityDate = conversation?.lastActivity ? new Date(conversation.lastActivity) : null;
    if (!lastActivityDate || Number.isNaN(lastActivityDate.getTime())) {
      groups[GROUP_LABELS.older].push(conversation);
      return;
    }

    if (lastActivityDate >= today) {
      groups[GROUP_LABELS.today].push(conversation);
    } else if (lastActivityDate >= yesterday) {
      groups[GROUP_LABELS.yesterday].push(conversation);
    } else if (lastActivityDate >= thisWeek) {
      groups[GROUP_LABELS.thisWeek].push(conversation);
    } else {
      groups[GROUP_LABELS.older].push(conversation);
    }
  });

  return groups;
}
