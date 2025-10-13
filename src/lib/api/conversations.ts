/**
 * Conversations API Helper Functions
 *
 * Centralized API calls untuk conversation management operations.
 * Mengikuti pattern yang ada di codebase dengan error handling konsisten.
 */

export interface UpdateTitleResult {
  success: boolean;
  error?: string;
  conversation?: {
    id: string;
    title: string;
    updated_at: string;
  };
}

/**
 * Update conversation title
 *
 * @param conversationId - UUID conversation yang akan di-update
 * @param newTitle - Judul baru (akan di-trim dan di-sanitize)
 * @returns Promise dengan result object
 */
export async function updateConversationTitle(
  conversationId: string,
  newTitle: string
): Promise<UpdateTitleResult> {
  try {
    // Validate input
    if (!conversationId) {
      return {
        success: false,
        error: 'Conversation ID is required'
      };
    }

    // Sanitize title: trim whitespace dan fallback ke "Untitled Chat"
    const sanitizedTitle = newTitle.trim() || 'Untitled Chat';

    // Call API endpoint
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: sanitizedTitle
      })
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to update title: ${response.statusText}`
      };
    }

    const data = await response.json();

    return {
      success: true,
      conversation: data.conversation
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}
