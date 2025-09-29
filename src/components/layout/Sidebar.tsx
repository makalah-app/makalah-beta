'use client';

/**
 * Sidebar - Navigation sidebar component dengan account menu
 *
 * DESIGN COMPLIANCE:
 * - Sidebar styling dan layout sesuai chat-page-styleguide.md
 * - Navigation items dengan proper icons dan hover states
 * - Account menu integration dengan user info display
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useChatHistory, ConversationItem } from '../../hooks/useChatHistory';


interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  // Navigation
  currentPath?: string;
  onNavigate?: (path: string) => void;
  // Chat
  onNewChat?: () => void;
  // User
  user?: {
    name: string;
    email: string;
    fullName?: string;
    avatar?: string;
    role?: string;
  };
  onUserMenuAction?: (action: string) => void;
}


const USER_MENU_ACTIONS = [
  { id: 'settings', label: 'Settings', icon: '' },
  { id: 'logout', label: 'Logout', icon: '' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  isCollapsed = false,
  currentPath = '',
  onNavigate,
  onNewChat,
  user,
  onUserMenuAction,
}) => {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['history']));
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Get chat history from database
  const { conversations, loading, error, refetch } = useChatHistory();


  // Handle conversation click - UNIFIED PARAMETER SYSTEM
  const handleConversationClick = (conversation: ConversationItem) => {
    // Navigate to chat page with UNIFIED chatId parameter (no more conversationId)
    const url = `/chat?chatId=${conversation.id}`;
    if (onNavigate) {
      onNavigate(url);
    } else {
      router.push(url);
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    if (isCollapsed) return; // Don't toggle when collapsed
    
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Handle delete conversation
  const handleDeleteConversation = async (conversation: ConversationItem) => {
    if (deleteTarget !== conversation.id) {
      setDeleteTarget(conversation.id);
      setDeleteError(null);
      return;
    }

    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Get user ID from localStorage as fallback
      const storedUserId = localStorage.getItem('userId');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add user ID header if available
      if (storedUserId) {
        headers['x-user-id'] = storedUserId;
      }

      const res = await fetch(`/api/chat/conversations/${conversation.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `Failed to delete conversation (${res.status})`);
      }

      await refetch();
      setDeleteTarget(null);

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const isCurrent = url.searchParams.get('conversationId') === conversation.id || url.searchParams.get('chatId') === conversation.id;
        if (isCurrent) {
          if (onNewChat) {
            onNewChat();
          } else {
            url.searchParams.delete('conversationId');
            url.searchParams.delete('chatId');
            window.history.pushState(null, '', url.toString());
          }
        }
      }
    } catch (e) {
      console.error('[Sidebar] Delete error:', e);
      setDeleteError(e instanceof Error ? e.message : 'Gagal menghapus percakapan');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  return (
    <div className={className}>
      {/* Logo M - Link to Home */}
      <div>
        <Link href="/" title="Makalah AI - Home">
          M
        </Link>
      </div>

      {/* Navigation Sections */}
      <div>
        {/* New Chat - Standalone Button */}
        <div>
          <button
            onClick={onNewChat || (() => {
              window.location.href = '/chat';
            })}
          >
            New Chat
          </button>
        </div>

        {/* Simple Chat History */}
        <div>
          <button
            onClick={() => toggleSection('history')}
          >
            <div>
              <span>Chat History</span>
              <span>
                {expandedSections.has('history') ? '▼' : '▶'}
              </span>
            </div>
          </button>

          {expandedSections.has('history') && (
            <div>
              {/* BASIC CHAT HISTORY - NO STYLING */}
              {loading && <div>Loading conversations...</div>}
              {error && <div>Error: {error}</div>}
              {!loading && !error && (
                <div>
                  {conversations.length === 0 ? (
                    <div>No conversations yet</div>
                  ) : (
                    <ul>
                      {conversations.map((conv) => (
                        <li key={conv.id}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={() => handleConversationClick(conv)}>
                              {conv.title || 'Untitled Chat'}
                              <br />
                              <small>
                                {conv.messageCount} messages - {new Date(conv.lastActivity).toLocaleDateString()}
                              </small>
                            </button>
                            {deleteTarget === conv.id ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <button
                                  onClick={() => handleDeleteConversation(conv)}
                                  disabled={isDeleting}
                                  title="Konfirmasi hapus"
                                >
                                  {isDeleting ? 'Deleting…' : 'Confirm'}
                                </button>
                                <button onClick={cancelDelete} title="Batal hapus">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeleteConversation(conv)}
                                title="Delete conversation"
                                aria-label={`Delete ${conv.title || 'conversation'}`}
                              >
                                Delete
                              </button>
                            )}
                            {deleteTarget === conv.id && deleteError && (
                              <span style={{ color: 'red', fontSize: 12 }}>{deleteError}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Dashboard Link */}
      {user && user.role?.toLowerCase() === 'admin' && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <span className="text-lg">🛠️</span>
            {!isCollapsed && <span className="font-medium">Dashboard</span>}
          </Link>
        </div>
      )}

      {/* User Menu */}
      {user && (
        <div>
          <div>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name || user.email || 'User'} />
                ) : (
                  ((user.name || user.fullName || user.email?.split('@')[0] || 'U') + '').split(' ').map(n => n && n[0] ? n[0] : 'U').join('').toUpperCase()
                )}
              </div>
              
              <div>
                <div>
                  {user.name || user.fullName || user.email?.split('@')[0] || 'User'}
                </div>
                <div>
                  {user.role || 'Researcher'}
                </div>
              </div>

              {!isCollapsed && (
                <span>
                  {isUserMenuOpen ? '▲' : '▼'}
                </span>
              )}
            </button>

            {/* User Menu Dropdown */}
            {isUserMenuOpen && (
              <div>
                {USER_MENU_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onUserMenuAction?.(action.id);
                    }}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {isCollapsed && (
        <div />
      )}
    </div>
  );
};

export default Sidebar;
