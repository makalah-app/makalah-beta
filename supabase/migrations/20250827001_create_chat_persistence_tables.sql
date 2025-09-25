-- =====================================================================================
-- Chat Persistence Tables Migration - Task 03 Database Integration
-- =====================================================================================
--
-- PURPOSE:
-- Creates tables for AI SDK v5 compliant chat message persistence
-- Supports UIMessage format storage and conversation management
-- Integrates with existing 24-table enterprise database schema
--
-- COMPLIANCE:
-- - AI SDK v5 persistence patterns from /docs/04-ai-sdk-ui/03-chatbot-message-persistence.mdx
-- - UIMessage[] format compatibility
-- - Server-side ID generation support
-- - Academic workflow integration
--
-- INTEGRATION POINTS:
-- - Links to existing users table for user management
-- - Connects with workflows table for academic workflow tracking
-- - Utilizes existing RLS policy patterns for security
--
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- CONVERSATIONS TABLE
-- Main container for chat sessions with workflow integration
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    current_phase INTEGER DEFAULT 1 CHECK (current_phase >= 1 AND current_phase <= 7),
    message_count INTEGER DEFAULT 0 CHECK (message_count >= 0),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    archived BOOLEAN DEFAULT FALSE NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workflow_id ON public.conversations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_conversations_current_phase ON public.conversations(current_phase);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON public.conversations(archived) WHERE archived = false;

-- Add metadata GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_conversations_metadata ON public.conversations USING GIN(metadata);

-- =====================================================================================
-- CHAT_MESSAGES TABLE  
-- Stores individual messages in AI SDK UIMessage format
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL UNIQUE, -- AI SDK message ID
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content JSONB, -- UIMessage content structure (can be null for messages with only parts)
    parts JSONB DEFAULT '[]'::jsonb, -- UIMessage parts array
    metadata JSONB DEFAULT '{}', -- Academic metadata (phase, tokens, model, etc.)
    sequence_number INTEGER NOT NULL, -- Order within conversation
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add unique constraint on conversation + sequence number
ALTER TABLE public.chat_messages 
ADD CONSTRAINT unique_conversation_sequence UNIQUE (conversation_id, sequence_number);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_id ON public.chat_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sequence ON public.chat_messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Add JSONB GIN indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_content ON public.chat_messages USING GIN(content);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parts ON public.chat_messages USING GIN(parts);
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata ON public.chat_messages USING GIN(metadata);

-- =====================================================================================
-- CHAT_SESSIONS TABLE
-- Tracks active chat sessions for real-time features
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMPTZ,
    activity_data JSONB DEFAULT '{}'
);

-- Add indexes for session management
CREATE INDEX IF NOT EXISTS idx_chat_sessions_conversation_id ON public.chat_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON public.chat_sessions(started_at DESC);

-- =====================================================================================
-- UPDATE EXISTING TABLES FOR CHAT INTEGRATION
-- =====================================================================================

-- Add conversation_id to ai_interactions for better tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='ai_interactions' AND column_name='conversation_id') THEN
        ALTER TABLE public.ai_interactions 
        ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_ai_interactions_conversation_id 
        ON public.ai_interactions(conversation_id);
    END IF;
END $$;

-- Add conversation_id to tool_usage_logs for better tracking  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tool_usage_logs' AND column_name='conversation_id') THEN
        ALTER TABLE public.tool_usage_logs 
        ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_conversation_id 
        ON public.tool_usage_logs(conversation_id);
    END IF;
END $$;

-- Add conversation_id to research_queries for better tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='research_queries' AND column_name='conversation_id') THEN
        ALTER TABLE public.research_queries 
        ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_research_queries_conversation_id 
        ON public.research_queries(conversation_id);
    END IF;
END $$;

-- Add conversation_id to artifacts for better tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='artifacts' AND column_name='conversation_id') THEN
        ALTER TABLE public.artifacts 
        ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_artifacts_conversation_id 
        ON public.artifacts(conversation_id);
    END IF;
END $$;

-- =====================================================================================
-- DATABASE FUNCTIONS FOR CHAT OPERATIONS
-- =====================================================================================

-- Function to get conversation messages in order
CREATE OR REPLACE FUNCTION get_conversation_messages(
    conversation_id_param UUID,
    limit_param INTEGER DEFAULT 1000,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    message_id TEXT,
    role TEXT,
    content JSONB,
    parts JSONB,
    metadata JSONB,
    sequence_number INTEGER,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.message_id,
        m.role,
        m.content,
        m.parts,
        m.metadata,
        m.sequence_number,
        m.created_at
    FROM public.chat_messages m
    WHERE m.conversation_id = conversation_id_param
    ORDER BY m.sequence_number ASC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$;

-- Function to get user conversations
CREATE OR REPLACE FUNCTION get_user_conversations(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    workflow_id UUID,
    current_phase INTEGER,
    message_count INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        c.workflow_id,
        c.current_phase,
        c.message_count,
        c.metadata,
        c.created_at,
        c.updated_at,
        (c.metadata->>'last_message_at')::TIMESTAMPTZ as last_message_at
    FROM public.conversations c
    WHERE c.user_id = user_id_param 
      AND c.archived = false
    ORDER BY c.updated_at DESC;
END;
$$;

-- Function to update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.conversations 
        SET message_count = message_count + 1,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.conversations 
        SET message_count = GREATEST(message_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Create triggers for automatic message count updates
DROP TRIGGER IF EXISTS trigger_update_message_count_insert ON public.chat_messages;
CREATE TRIGGER trigger_update_message_count_insert
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_message_count();

DROP TRIGGER IF EXISTS trigger_update_message_count_delete ON public.chat_messages;
CREATE TRIGGER trigger_update_message_count_delete
    AFTER DELETE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_message_count();

-- =====================================================================================
-- UPDATE TRIGGERS FOR EXISTING TABLES
-- =====================================================================================

-- Add updated_at triggers for new tables
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON TABLE public.conversations IS 'Main chat conversation container - AI SDK v5 compliant';
COMMENT ON COLUMN public.conversations.id IS 'Primary key - also serves as chatId for AI SDK';
COMMENT ON COLUMN public.conversations.message_count IS 'Cached count of messages in conversation';
COMMENT ON COLUMN public.conversations.current_phase IS 'Current academic workflow phase (1-7)';
COMMENT ON COLUMN public.conversations.metadata IS 'JSONB metadata including last_message_at, workflow context';

COMMENT ON TABLE public.chat_messages IS 'Individual chat messages in UIMessage format - AI SDK v5 compliant';
COMMENT ON COLUMN public.chat_messages.message_id IS 'AI SDK message ID - unique across all conversations';
COMMENT ON COLUMN public.chat_messages.content IS 'UIMessage content - can be null for messages with only parts';
COMMENT ON COLUMN public.chat_messages.parts IS 'UIMessage parts array - supports tool calls, files, etc.';
COMMENT ON COLUMN public.chat_messages.sequence_number IS 'Order within conversation - auto-generated';

COMMENT ON TABLE public.chat_sessions IS 'Active chat sessions for real-time features and presence tracking';

COMMENT ON FUNCTION get_conversation_messages IS 'AI SDK compliant function to retrieve messages for loadChat()';
COMMENT ON FUNCTION get_user_conversations IS 'Function to retrieve user conversation summaries';

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_name IN ('conversations', 'chat_messages', 'chat_sessions');
    
    IF table_count = 3 THEN
        RAISE NOTICE '✅ All chat persistence tables created successfully';
    ELSE
        RAISE WARNING '⚠️ Expected 3 chat tables, found %', table_count;
    END IF;
END $$;