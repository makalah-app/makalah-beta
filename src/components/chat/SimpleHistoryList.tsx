/**
 * Simple History List Component
 * MVP implementation for basic conversation history display without styling
 */

import React, { useState, useEffect } from 'react';
import { getAllConversations, ConversationItem } from '../../lib/database/simple-history';

interface SimpleHistoryListProps {
  onRefresh?: () => void;
}

export const SimpleHistoryList: React.FC<SimpleHistoryListProps> = ({ onRefresh }) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    console.log('[SimpleHistoryList] Loading conversations...');
    const data = await getAllConversations();
    setConversations(data);
  };

  // Handle conversation click - navigate to conversation
  const handleConversationClick = (conversationId: string) => {
    console.log(`[SimpleHistoryList] Switching to conversation: ${conversationId}`);
    window.location.href = `/?chatId=${conversationId}`;
  };

  // Handle refresh request from parent
  useEffect(() => {
    if (onRefresh) {
      // Expose refresh function to parent
      (window as any).refreshHistoryList = loadConversations;
    }
  }, [onRefresh]);

  if (conversations.length === 0) {
    return (
      <div>
        <div>No conversations found</div>
      </div>
    );
  }

  return (
    <div>
      <div>Chat History ({conversations.length})</div>
      <div>
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => handleConversationClick(conversation.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '4px',
              marginBottom: '2px',
              border: '1px solid #ccc',
              background: 'none',
              cursor: 'pointer'
            }}
          >
            <div>
              ID: {conversation.id.substring(0, 8)}...
            </div>
            <div>
              Messages: {conversation.message_count}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};