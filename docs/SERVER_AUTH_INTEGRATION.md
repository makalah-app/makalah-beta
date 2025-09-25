# Server-Side Authentication Integration Guide

## Task 13-6: Chat History Persistence Fix

### Problem Solved
Chat API was hardcoding `userId: 'system'` for message persistence, preventing proper chat history tracking per authenticated user.

### Solution Overview
Installed and configured `@supabase/ssr` for server-side session extraction in Next.js API routes.

## Packages Installed

### Primary Dependencies
```json
{
  "@supabase/ssr": "^0.7.0",
  "@supabase/auth-helpers-nextjs": "^0.10.0"
}
```

**Note**: `@supabase/auth-helpers-nextjs` is deprecated but installed for backward compatibility. `@supabase/ssr` is the recommended modern approach.

## Configuration Files

### 1. Server-Side Auth Configuration
**File**: `/src/lib/database/supabase-server-auth.ts`

**Key Functions**:
- `getServerSessionUserId()` - Extract user ID from server-side session
- `getUserIdWithSystemFallback()` - Get user ID with system fallback
- `getValidatedServerSession()` - Advanced session validation
- `validateServerAuth()` - Debug authentication context

### 2. Integration Pattern

**Before** (Hardcoded System User):
```typescript
persistMessagesAsync(messages, {
  conversationId: chatId,
  userId: 'system', // ❌ Hardcoded
  phase: currentPhase,
  sessionId,
  streamCoordinationData: { ... }
});
```

**After** (Dynamic User Extraction):
```typescript
import { getUserIdWithSystemFallback } from '../../../src/lib/database/supabase-server-auth';

// Extract authenticated user ID from server-side session
const userId = await getUserIdWithSystemFallback();

persistMessagesAsync(messages, {
  conversationId: chatId,
  userId, // ✅ Dynamic user ID or 'system' fallback
  phase: currentPhase,
  sessionId,
  streamCoordinationData: { ... }
});
```

## Usage Examples

### Basic User ID Extraction
```typescript
import { getServerSessionUserId } from '@/lib/database/supabase-server-auth';

export async function POST(req: Request) {
  const { userId, error } = await getServerSessionUserId();
  
  if (error) {
    console.warn('Auth extraction failed:', error);
  }
  
  const effectiveUserId = userId || 'system';
  // Use effectiveUserId for persistence...
}
```

### With System Fallback
```typescript
import { getUserIdWithSystemFallback } from '@/lib/database/supabase-server-auth';

export async function POST(req: Request) {
  const userId = await getUserIdWithSystemFallback();
  // Always returns string - either user ID or 'system'
  // Use userId for persistence...
}
```

### Advanced Session Validation
```typescript
import { getValidatedServerSession } from '@/lib/database/supabase-server-auth';

export async function POST(req: Request) {
  const { userId, isSystem, sessionValid, fallbackReason } = await getValidatedServerSession();
  
  console.log(`Using ${isSystem ? 'system' : 'user'} context: ${userId}`);
  if (fallbackReason) {
    console.log(`Fallback reason: ${fallbackReason}`);
  }
  
  // Use userId for persistence...
}
```

## Authentication Context Flow

### 1. Server-Side Session Creation
- User authenticates via Supabase Auth (login/register)
- Session cookies are set by Supabase Auth
- Cookies contain encrypted session tokens

### 2. API Route Session Extraction
- `createSupabaseServerClient()` reads session cookies
- `supabase.auth.getUser()` validates and extracts user data
- Returns authenticated user ID or null

### 3. Message Persistence Integration
- Chat API extracts user ID from server session
- Uses extracted ID for message persistence
- Falls back to 'system' if no authenticated user

## Error Handling

### Authentication Errors
```typescript
const { userId, error } = await getServerSessionUserId();

if (error) {
  // Handle auth error gracefully
  console.warn('Auth failed:', error);
  // Fallback to system user for persistence
}
```

### Cookie Access Issues
```typescript
// Server auth handles cookie access failures gracefully
// Logs warnings but doesn't crash API routes
// Returns null user ID if cookies inaccessible
```

## RLS Policy Compatibility

### Existing Database Policies
- Current RLS policies already support user-based access control
- No policy changes required for user ID extraction
- System user maintains existing access patterns

### Message Persistence Tables
- `ai_interactions` table accepts both user IDs and 'system'
- `conversations` table supports user-specific conversations
- No schema changes required

## Next Implementation Step

**Ready for Task 13-6 Part 2**: Modify chat API route to use dynamic user extraction instead of hardcoded 'system' user.

**Target Change Location**: 
- File: `/app/api/chat/route.ts`
- Line: 374 (and line 476 for fallback path)
- Change: Replace `userId: 'system'` with extracted user ID

## Testing Approach

### Authentication States to Test
1. **Authenticated User**: Logged in user should get their user ID
2. **Unauthenticated User**: Anonymous user should fallback to 'system'
3. **Invalid Session**: Expired/invalid tokens should fallback to 'system'
4. **Cookie Issues**: Cookie access problems should fallback to 'system'

### Verification Methods
```typescript
// Debug authentication context
import { validateServerAuth } from '@/lib/database/supabase-server-auth';

const authContext = await validateServerAuth();
console.log('Auth context:', authContext);
```

## Security Considerations

### Server-Side Only
- User extraction only works in server-side contexts
- API routes have access to HTTP-only cookies
- Client-side components use different auth patterns

### Fallback Behavior
- System fallback maintains backward compatibility
- No breaking changes to existing functionality
- Graceful degradation for auth issues

### Privacy Compliance
- User ID extraction respects session validity
- No sensitive data exposed in logs
- Authentication errors handled discretely

---

**Status**: ✅ **COMPLETED** - Server-side authentication infrastructure ready
**Next**: Implement dynamic user extraction in chat API route