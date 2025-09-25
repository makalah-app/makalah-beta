# Database Query Helper Functions

Database query helper functions untuk admin operations dengan crypto polyfill compatibility dan comprehensive error handling.

## File Location

`/src/lib/admin/database-queries.ts`

## Features

✅ **9 Complete Functions** - All required admin database operations  
✅ **Crypto Polyfill Compatibility** - Environment-aware UUID generation  
✅ **Comprehensive Error Handling** - Connection issues, validation errors  
✅ **Input Validation** - Zod schema validation untuk data sanitization  
✅ **Type Safety** - Full TypeScript support dengan database types  
✅ **Supabase Integration** - Follows existing client patterns  

## Functions Implemented

### 1. `getUserStatistics()`
Fetch total users dan active users count
```typescript
const result = await getUserStatistics();
// Returns: { total_users, active_users, new_users_30d, last_updated }
```

### 2. `getModelConfigurations()`  
Fetch primary/fallback model configurations
```typescript
const result = await getModelConfigurations();
// Returns: { primary, fallback, all_models }
```

### 3. `updateModelConfiguration(provider, config)`
Update model config dengan provider settings
```typescript
const result = await updateModelConfiguration('openai', {
  model_name: 'gpt-4o',
  temperature: 0.1,
  max_tokens: 4096,
  is_active: true
});
```

### 4. `getCurrentSystemPrompt()`
Fetch active system prompt dengan version info
```typescript
const result = await getCurrentSystemPrompt();
// Returns: { id, content, version, phase, char_count, ... }
```

### 5. `updateSystemPrompt(content, updatedBy, changeReason)`
Save system prompt dengan version tracking
```typescript
const result = await updateSystemPrompt(
  'New system prompt content',
  'admin@example.com',
  'Updated for better performance'
);
```

### 6. `getPromptVersionHistory(limit)`
Fetch prompt version history
```typescript
const result = await getPromptVersionHistory(20);
// Returns: Array of version history entries
```

### 7. `getAPIKeys(includeSensitive)`
Fetch API keys dengan masking untuk security
```typescript
const result = await getAPIKeys(false); // Masked values
const result = await getAPIKeys(true);  // Raw values (admin only)
```

### 8. `storeAPIKey(provider, apiKey)`
Store API key securely
```typescript
const result = await storeAPIKey('openai', 'sk-...');
// Returns: { provider, configured }
```

### 9. `getConfigurationStatus()`
Fetch comprehensive config status
```typescript
const result = await getConfigurationStatus();
// Returns: Complete system configuration overview
```

## Response Format

Semua functions return consistent response format:

```typescript
interface DatabaseQueryResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    type: 'database_error' | 'validation_error' | 'connection_error' | 'auth_error';
    details?: any;
  };
}
```

## Error Handling

### Crypto Polyfill Issues
Functions automatically handle crypto availability issues dengan fallback UUID generation:

```typescript
// Fallback untuk environments without crypto
crypto = {
  randomUUID: () => `${Date.now()}-${Math.random().toString(36).substring(2)}`
};
```

### Connection Errors
All database operations wrapped dengan `safeQuery()` function untuk consistent error handling.

### Validation Errors
Input validation menggunakan Zod schemas untuk data sanitization dan type safety.

## Usage Examples

### Basic Admin Dashboard Operations

```typescript
import {
  getUserStatistics,
  getConfigurationStatus,
  getCurrentSystemPrompt
} from '@/lib/admin/database-queries';

// Get user stats for dashboard
const userStats = await getUserStatistics();
if (userStats.success) {
  console.log('Total users:', userStats.data.total_users);
}

// Check system configuration
const configStatus = await getConfigurationStatus();
if (configStatus.success) {
  console.log('Overall status:', configStatus.data.overall_status);
}

// Get current system prompt
const systemPrompt = await getCurrentSystemPrompt();
if (systemPrompt.success && systemPrompt.data) {
  console.log('Prompt version:', systemPrompt.data.version);
}
```

### Model Configuration Management

```typescript
import {
  getModelConfigurations,
  updateModelConfiguration
} from '@/lib/admin/database-queries';

// Get current model configs
const models = await getModelConfigurations();

// Update primary model
const updateResult = await updateModelConfiguration('openai', {
  model_name: 'gpt-4o-mini',
  temperature: 0.2,
  max_tokens: 8192,
  is_active: true
});
```

### API Key Management

```typescript
import {
  getAPIKeys,
  storeAPIKey
} from '@/lib/admin/database-queries';

// Get masked API keys for display
const keys = await getAPIKeys(false);

// Store new API key
const storeResult = await storeAPIKey('openrouter', 'sk-...');
```

## Testing

Test file tersedia di: `/test-database-queries.js`

```bash
cd /Users/eriksupit/Desktop/makalah/makalahApp
node test-database-queries.js
```

## Integration Notes

- **Supabase Client**: Menggunakan `supabaseAdmin` untuk operations yang memerlukan elevated access
- **Type Safety**: Fully typed dengan Database interface dari `@/lib/types/database-types`
- **Performance**: Query optimization dengan proper indexing dan limits
- **Security**: Sensitive data masking dan input validation

## Production Considerations

1. **Error Monitoring**: Add proper logging untuk production environments
2. **Rate Limiting**: Consider adding rate limits untuk admin operations
3. **Audit Trails**: All operations logged untuk security compliance
4. **Backup Strategy**: Regular backups dari configuration data

## Crypto Polyfill Compatibility

Handles multiple environments:
- ✅ Browser (`window.crypto`)
- ✅ Node.js dengan global crypto
- ✅ Node.js dengan require('crypto')
- ✅ Fallback UUID generation

## Dependencies

- `@supabase/supabase-js` - Database client
- `zod` - Schema validation
- Custom types dari `@/lib/types/database-types`

---

**Status**: ✅ **COMPLETED**  
**Task**: Database Query Helper Functions Implementation  
**Compatibility**: Crypto polyfill ready, full error handling, type-safe operations