# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

JANGAN LAKUKAN COMMIT GIT DAN PUSH GITHUB TANPA VALIDASI USER

### Development
```bash
npm run dev              # Start dev server on port 3000
npm run build            # Production build ✅ (builds successfully with 28 ESLint warnings)
npm run start            # Start production server
npm run type-check       # Check TypeScript types ✅ (clean, no errors)
npm run lint            # Run ESLint (28 warnings, non-blocking)
npx playwright test     # Run E2E tests (test dir: src/__tests__/e2e)
npm run type-check:watch # Watch mode for TypeScript checking
```

### Database Operations
**✅ STATUS UPDATE**: Native MCP tools (`mcp__supabase__*`) sudah BERFUNGSI kembali!
```bash
# Gunakan native MCP tools (RECOMMENDED)
mcp__supabase__execute_sql
mcp__supabase__list_tables
mcp__supabase__apply_migration

# Fallback crypto-patched scripts (jika native MCP error)
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM auth.users"
node scripts/mcp-with-crypto.mjs "SELECT * FROM user_profiles LIMIT 5"

# Common queries
node scripts/mcp-with-crypto.mjs "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
node scripts/mcp-with-crypto.mjs "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages'"
```

### System Prompt Management
```bash
# Update system prompts from __references__ to database
node scripts/update-prompts.mjs

# This will:
# 1. Read OPENAI_SYSTEM_PROMPT.md and GEMINI_SYSTEM_PROMPT.md
# 2. Deactivate old system prompts (set is_active=false)
# 3. Insert new prompts with version v3.0-verbose
# 4. Set priority_order: 1 (OpenAI), 2 (Gemini/OpenRouter)
```

## Architecture Overview

### Codebase Scale
- **~75,126 lines** of TypeScript/TSX code (cleaned up & optimized)
- **95 React components** organized in modular architecture
- **36 database migrations** with comprehensive RLS policies
- **10 API route groups** for various features

### AI System (Vercel AI SDK v5)
- **Dual Provider**: OpenAI GPT-4o primary, OpenRouter Gemini 2.5 Flash fallback (Perplexity removed Oct 1, 2025)
- **Dynamic Configuration**: [src/lib/ai/dynamic-config.ts](src/lib/ai/dynamic-config.ts) - Database-driven provider selection dengan 30-second cache (optimized from 5-min)
- **Built-in Web Search**:
  - **OpenAI**: Native web search via `openai.responses()` API with `webSearchPreview` tool
  - **OpenRouter**: Automatic web search via `:online` suffix (e.g., `google/gemini-2.5-flash:online`)
- **Provider Failover**: [src/lib/ai/providers/manager.ts](src/lib/ai/providers/manager.ts) - Circuit breaker pattern dengan health monitoring
- **Core endpoint**: [app/api/chat/route.ts](app/api/chat/route.ts) - streaming chat dengan 7-phase academic workflow
- **Configuration**: [src/lib/ai/config/ai-config.ts](src/lib/ai/config/ai-config.ts) - centralized AI settings
- **Key patterns**:
  - `streamText()` dan `convertToModelMessages()` from AI SDK v5
  - `createUIMessageStream()` untuk unified streaming
  - `smoothStream()` dengan 35ms word-by-word chunking
  - `toUIMessageStream()` untuk provider independence

### Database (Supabase)
- **24 tables** with comprehensive Row Level Security
- **Key tables**:
  - `auth.users` - User authentication dengan role-based access
  - `conversations` - Chat persistence dengan metadata
  - `chat_messages` - UIMessage format storage dengan parts array
  - `artifacts` - Generated documents dengan versioning
  - `user_profiles` - Extended user information
  - `model_configs` - Dynamic AI model configuration
  - `admin_settings` - Runtime settings dengan encryption support
  - `system_prompts` - Centralized prompt management
  - `model_prompt_templates` - Model-specific prompt templates
  - `chat_files` - File upload support
- **Authentication**: Server-side session extraction with UUID fallback
- **Fire-and-forget pattern** for chat history to prevent blocking
- **Middleware**: [middleware.ts](middleware.ts) - Supabase session refresh dengan cookie management

### Critical Files (Handle with Care)
- `app/api/chat/route.ts` - Core streaming chat API dengan dual provider failover
- `src/lib/ai/dynamic-config.ts` - Dynamic model configuration dengan database integration
- `src/lib/ai/providers/manager.ts` - Provider failover & health management
- `src/lib/ai/config/ai-config.ts` - AI configuration hub
- `src/components/chat/ChatContainer.tsx` - Main chat UI dengan streaming state
- `src/lib/database/chat-store.ts` - Chat persistence dengan UIMessage format
- `src/lib/database/supabase-server-auth.ts` - Server-side authentication
- `middleware.ts` - Session middleware untuk semua routes (7-day cookie lifetime)
- `next.config.js` - Webpack configuration dengan crypto polyfills

### Component Architecture
- **Next.js 14 App Router** with React Server Components
- **ShadCN/UI** components with 3px border radius standard
- **TailwindCSS** with semantic design tokens (`bg-background`, `text-foreground`)
- **Path aliases**: `@/*` → `./src/*`
- **Error Boundaries**: 7-layer hierarchy (Universal, Chat, Database, API, Streaming, File, UniversalErrorBoundary)
- **AI Elements Integration**: Vercel AI UI components untuk tool results, sources, reasoning
- **Theme System**: Dark mode default dengan ThemeProvider
- **Mobile Responsive**: Full mobile support dengan adaptive layouts

## Known Issues & Fixes

### Recent Critical Changes (Sept 28 - Oct 2, 2025)

#### 🚨 BREAKING: Perplexity Dependency Removed (Oct 1, 2025)
- **Commit**: 2aa0ae7 - "refactor: remove Perplexity dependency and implement OpenRouter :online web search"
- **Impact**: Complete removal of Perplexity Sonar integration
- **Migration**: OpenRouter now uses native `:online` suffix for web search
- **Changes**:
  - Removed over-engineered web search pairing architecture
  - Simplified to pure dual provider: OpenAI + OpenRouter
  - Removed 156 lines of Perplexity-specific code
  - Updated search providers from 'perplexity' to 'openrouter-online'
  - No environment variable needed for PERPLEXITY_API_KEY anymore

#### ✅ Title Generation Leak Fixed (Oct 2, 2025)
- **Commit**: 99722ea - "fix(ai): hardcode GPT-4o model for ALL title generation"
- **Bug**: Title generation was leaking to OpenRouter (8→9 tokens) despite forcing OpenAI
- **Root Cause**: Conditional model selection passed wrong model names to OpenAI API
- **Fix**: Hardcoded `'gpt-4o'` for all title generation, removed conditionals
- **Affected Files**:
  - `src/lib/database/chat-store.ts:736`
  - `app/api/admin/backfill-titles/route.ts:66`
  - `app/api/chat/history/route.ts:331` (user-based)
  - `app/api/chat/history/route.ts:387` (assistant-based)

#### 🔧 Session Cookie Extended to 7 Days (Oct 2, 2025)
- **Commit**: ede7acc - "fix(auth): extend session cookie lifetime to 7 days"
- **Change**: `middleware.ts:23` - maxAge set to `60 * 60 * 24 * 7` (7 days)
- **Benefit**: Better session persistence, reduced re-authentication frequency

#### ⚡ Config Cache Optimized to 30 Seconds (Oct 1, 2025)
- **Commit**: 3595401 - "fix(ai): resolve provider architecture leak & optimize config cache"
- **Change**: Reduced TTL from 5 minutes to 30 seconds
- **File**: `src/lib/ai/dynamic-config.ts:20`
- **Benefit**: Faster real-time configuration updates from admin panel

#### 🎨 ESLint Configuration Updated (Sept 30, 2025)
- **Commit**: ce67d07 - "chore(eslint): disable react-hooks/exhaustive-deps warnings"
- **Changes**:
  - Disabled `react-hooks/exhaustive-deps` warning (line 4)
  - Added crypto usage prevention rules
  - Prevents accidental Node.js crypto imports in client code

#### 📝 System Prompt Versioning (Current: v3.0-verbose)
- **New Script**: `scripts/update-prompts.mjs` (untracked)
- **Purpose**: Update system prompts from `__references__/*.md` to database
- **Prompts**:
  - `__references__/OPENAI_SYSTEM_PROMPT.md` → `system_prompts` (phase: system_instructions)
  - `__references__/GEMINI_SYSTEM_PROMPT.md` → `system_prompts` (phase: openrouter_instructions)
- **Version**: v3.0-verbose (priority_order: 1 for OpenAI, 2 for Gemini)

### Current Build Status (Per 2 Oct 2025)
✅ **TypeScript**: Clean build, no errors (tested via `npm run type-check`)
⚠️ **ESLint**: 28 warnings (img elements, anonymous exports) - non-blocking for deployment
  - Note: `react-hooks/exhaustive-deps` warning disabled via .eslintrc.json
✅ **Production Build**: Sukses menggenerate build dengan 36 static pages
✅ **Dependencies**: All up to date, Node.js v20.x compatible (73 total packages)

### MCP Tools Status
✅ **Native MCP Tools**: BERFUNGSI - gunakan `mcp__supabase__*` tools
🔧 **Fallback Crypto Scripts**: Tersedia di [scripts/mcp-with-crypto.mjs](scripts/mcp-with-crypto.mjs) jika native MCP error
```bash
# Jika native MCP error:
node scripts/mcp-with-crypto.mjs "YOUR_SQL_QUERY"
```

## Testing Credentials
```
Admin:  makalah.app@gmail.com / M4k4l4h2025
User 1: 1200pixels@gmail.com / M4k4l4h2025
User 2: posteriot@gmail.com / M4k4l4h2025
```

## 7-Phase Academic Workflow
1. **Research Analysis** - Topic understanding and source gathering
2. **Outline Generation** - Structure planning with approval gate
3. **Content Drafting** - Initial content creation
4. **Citation Integration** - Academic source integration
5. **Structure Refinement** - Organization improvements
6. **Quality Review** - Final review and adjustments
7. **Final Formatting** - Document finalization

Each phase has approval gates requiring user confirmation to proceed.

## Advanced Features

### Dynamic Configuration System
- **Database-driven AI provider selection** - Runtime provider swapping tanpa restart
- **30-second configuration cache** - Optimized from 5-min for faster config updates (set Oct 1, 2025)
- **Automatic web search integration**:
  - OpenAI models → Native `webSearchPreview` tool via `openai.responses()` API
  - OpenRouter models → Automatic `:online` suffix appended to model name (e.g., `google/gemini-2.5-flash:online`)
- **Model-specific prompt templates** - Per-model customization via `model_prompt_templates` table
- **System prompt versioning** - Current version: v3.0-verbose (managed via `scripts/update-prompts.mjs`)
- **Real-time config updates** - Admin panel changes reflect within 30 seconds after cache expiry

### Enhanced Chat Features
- **Message editing** - Edit sent messages dengan real-time sync ([MessageEditor.tsx](src/components/chat/MessageEditor.tsx))
- **Fire-and-forget persistence** - Non-blocking chat history saves
- **Citation tracking** - Source attribution dengan hover preview
- **Message deletion** - Soft delete dengan confirmation dialog
- **Conversation archiving** - Archive old conversations dengan restore capability
- **Auto-scroll management** - Smart scroll behavior saat streaming

### Admin Panel Capabilities
- **Model configuration** - Manage AI models via `model_configs` table
- **System prompt customization** - Centralized prompt management via `system_prompts` table
- **Provider health monitoring** - Real-time provider status dan failover state
- **User management** - Role-based access control (admin/user/researcher)
- **Template versioning** - Version control untuk prompt templates
- **Encrypted settings** - Secure storage untuk API keys via `admin_settings`

### Error Handling & Resilience
- **Circuit breaker pattern** - Auto-failover saat primary provider down
- **Error classification** - Rate limit, timeout, network, auth errors
- **Graceful degradation** - Fallback responses saat both providers unavailable
- **7-layer error boundaries** - Comprehensive error catching hierarchy
- **Error recovery modal** - User-friendly error resolution UI
- **Provider health tracking** - Success rate monitoring dengan auto-recovery

### Performance Optimizations
- **Webpack cache optimization** - Gzip compression dengan custom cache directory
- **Configuration caching** - 30-second TTL untuk database config queries (optimized Oct 1, 2025)
- **Database connection pooling** - Pooling size 10 untuk optimal performance
- **Smooth streaming** - 35ms word-by-word chunking untuk ChatGPT-like UX
- **Response compression** - Gzip compression untuk API responses
- **Code splitting** - Dynamic imports untuk reduced bundle size
- **Session persistence** - 7-day cookie lifetime untuk extended sessions (set Oct 2, 2025)

### Security Features
- **Row Level Security** - RLS policies pada semua 24 tables
- **JWT authentication** - Server-side session validation
- **Cookie-based sessions** - Secure session management dengan auto-refresh
- **Admin permission system** - Role-based access control
- **Encrypted secrets** - API keys stored encrypted in database
- **Input validation** - Comprehensive input sanitization

## Testing Structure
```
src/__tests__/
├── e2e/                     # End-to-end tests (Playwright)
│   ├── complete-workflow.spec.ts
│   ├── hitl-approval-flow.spec.ts
│   └── theme-toggle.spec.ts
├── integration/             # Integration tests
│   ├── database-chat-integration.test.ts
│   └── task03-database-integration.test.ts
├── unit/                    # Unit tests
│   ├── signal-detection.test.ts
│   └── hitl-integration-simple.test.ts
└── static-analysis/         # Static analysis tests
    └── p01-static-analysis.ts
```

**Playwright Configuration**:
- **Multi-browser testing**: Chromium, Firefox, WebKit
- **Mobile testing**: Pixel 5, iPhone 12
- **Auto-retry**: 2 retries on CI
- **Visual regression**: Screenshots + videos on failure

## Dependencies Overview
- **Node.js**: v20.x (required)
- **Package Count**: 73 total (dependencies + devDependencies)
- **AI SDK**: v5.0.47 with dual-provider support (OpenAI + OpenRouter)
- **Testing**: Playwright + Jest for comprehensive testing
- **Database**: Supabase with 10 active users
- **Build System**: Next.js 14 with Turbopack
- **Removed Dependencies**: Perplexity Sonar (removed Oct 1, 2025)

## Environment Variables

### Required Variables
```bash
# Primary AI Provider - OpenAI
OPENAI_API_KEY=sk-...                    # OpenAI API key
OPENAI_BASE_URL=https://api.openai.com/v1

# Fallback AI Provider - OpenRouter (with :online suffix for web search)
OPENROUTER_API_KEY=sk-or-...             # OpenRouter API key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Database - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...     # Public anon key
SUPABASE_SERVICE_KEY=eyJ...              # Service role key (admin operations)

# Authentication
JWT_SECRET=your-secret-key               # JWT signing secret
NEXTAUTH_SECRET=your-nextauth-secret     # NextAuth.js secret
NEXTAUTH_URL=http://localhost:3000       # Production: https://your-domain.com
```

### Optional Configuration
```bash
# Model Configuration
PRIMARY_MODEL=gpt-4o                     # Default primary model
FALLBACK_MODEL=google/gemini-2.5-flash   # Default fallback model
PRIMARY_MODEL_MAX_TOKENS=8192            # Max tokens for primary
FALLBACK_MODEL_MAX_TOKENS=4096           # Max tokens for fallback

# Provider Health & Rate Limiting
HEALTH_CHECK_INTERVAL=30000              # Health check interval (ms)
HEALTH_CHECK_TIMEOUT=5000                # Health check timeout (ms)
PROVIDER_RETRY_ATTEMPTS=3                # Retry attempts on failure
RATE_LIMIT_REQUESTS_PER_MINUTE=60        # Rate limit threshold
RATE_LIMIT_TOKENS_PER_MINUTE=100000      # Token usage limit

# Development
NODE_ENV=development                     # Environment: development/staging/production
LOG_LEVEL=debug                          # Logging level: debug/info/warn/error
DEBUG_AI_CALLS=true                      # Enable AI call debugging
```

## Deployment Notes
- **Working directory**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/`
- **Node.js requirement**: v20.x (specified in package.json)
- **Environment variables**: See `.env.example` - semua required variables harus diset
- **Production build**: ✅ Ready for deployment (ESLint warnings are non-blocking)
- **Static pages**: 36 pre-generated pages
- **Bundle analysis**: Main chat route ~352 kB First Load JS

### Build Configuration
- **Webpack optimization**: Custom cache directory dengan gzip compression
- **Client-side polyfills**: Buffer, stream, util (crypto disabled untuk fix build)
- **Server-side**: Native Node.js modules (crypto, fs, net, tls)
- **Code splitting**: Dynamic imports untuk optimized bundle size
- **SSE streaming**: Custom headers untuk real-time chat streaming

### Pre-deployment Checklist
1. ✅ Set all environment variables (.env.local atau production secrets)
2. ✅ Run `npm run type-check` - harus clean, no errors
3. ✅ Run `npm run build` - harus sukses (ESLint warnings OK)
4. ✅ Test database connection (gunakan MCP tools atau scripts)
5. ✅ Verify API keys untuk OpenAI dan OpenRouter
6. ✅ Configure Supabase RLS policies jika fresh database
7. ✅ Run migrations: `supabase db push` atau via Supabase dashboard


## Common Development Patterns

### Web Search Integration

#### OpenRouter `:online` Suffix
```typescript
// ✅ CORRECT: OpenRouter with automatic web search
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

// Add :online suffix for built-in web search
const modelWithSearch = openrouter.chat('google/gemini-2.5-flash:online');

const result = await streamText({
  model: modelWithSearch,
  prompt: "Research the latest AI developments",
  // Web search results automatically included in model's context
});

// ❌ WRONG: No :online suffix = no web search
const model = openrouter.chat('google/gemini-2.5-flash'); // Missing :online
```

#### OpenAI Native Web Search
```typescript
// ✅ CORRECT: OpenAI with native web search
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: (openai as any).responses('gpt-4o'),
  prompt: "Research quantum computing breakthroughs",
  tools: {
    web_search_preview: (openai as any).tools.webSearchPreview({
      searchContextSize: 'high',
    }),
  },
});

// Access sources from result.sources
console.log('Web sources:', result.sources);
```

### AI SDK v5 Best Practices
```typescript
// ✅ CORRECT: Use AI SDK v5 patterns
import { streamText, convertToModelMessages, createUIMessageStream } from 'ai';

// Dynamic model configuration (already includes :online for OpenRouter)
const config = await getDynamicModelConfig();
const result = streamText({
  model: config.primaryModel, // Already has :online if OpenRouter
  messages: convertToModelMessages(uiMessages),
  system: config.systemPrompt,
  experimental_transform: smoothStream({ delayInMs: 35, chunking: 'word' })
});

// ❌ WRONG: Hardcoded models
const model = openai('gpt-4o'); // Don't hardcode - use dynamic config
```

### Database Query Patterns
```typescript
// ✅ CORRECT: Use type-safe Supabase client
import { supabaseAdmin } from '@/lib/database/supabase-client';

const { data, error } = await supabaseAdmin
  .from('conversations')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });

// ❌ WRONG: Raw SQL without types
// Use MCP tools atau typed queries
```

### Error Handling Patterns
```typescript
// ✅ CORRECT: Comprehensive error handling
try {
  const result = await streamText({ ... });
} catch (error) {
  // Classify error type
  const errorType = classifyError(error);

  if (errorType === 'rate_limit') {
    // Trigger failover
    return useFallbackProvider();
  }

  // Log for monitoring
  console.error('[Chat] Error:', { type: errorType, error });
}

// ❌ WRONG: Silent failures
try { ... } catch {} // Don't swallow errors
```

### Component Patterns
```typescript
// ✅ CORRECT: Use shared UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// ✅ CORRECT: Error boundaries untuk async operations
<ChatErrorBoundary>
  <ChatContainer />
</ChatErrorBoundary>

// ❌ WRONG: Inline styles atau hardcoded values
<div style={{ borderRadius: '5px' }}> // Use 3px standard
```

### File Organization
```
✅ CORRECT Structure:
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (ShadCN)
│   ├── chat/            # Chat-specific components
│   ├── admin/           # Admin panel components
│   └── error-handling/  # Error boundary components
├── lib/                 # Business logic & utilities
│   ├── ai/             # AI SDK integration
│   ├── database/       # Supabase queries
│   ├── config/         # Configuration management
│   └── utils/          # Helper functions
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

### Performance Guidelines
- **Use configuration cache**: `getDynamicModelConfig()` sudah cached 30 seconds (optimized Oct 1, 2025)
- **Avoid blocking operations**: Use fire-and-forget pattern untuk persistence
- **Optimize database queries**: Add indexes, use `.select()` columns specifically
- **Minimize re-renders**: Use `React.memo()` untuk expensive components
- **Code splitting**: Import large components dynamically
- **Title generation**: Hardcoded GPT-4o untuk prevent provider leak (fixed Oct 2, 2025)

### Security Guidelines
- **Never expose service keys**: Use `NEXT_PUBLIC_` prefix only untuk client-safe keys
- **Validate user input**: Always sanitize before database operations
- **Check authentication**: Use `getUserIdWithSystemFallback()` di API routes
- **Enforce RLS**: Database RLS policies harus enabled untuk semua tables
- **Encrypt secrets**: Store API keys in `admin_settings` dengan encryption flag

## Architecture Decisions & Learnings

### 🎓 System Prompt vs Middleware Injection (Oct 2, 2025)

**DECISION**: Use rich system prompts for persona/behavior, NOT middleware injection

**Context:**
Eksperimen dengan middleware injection pattern untuk inject PhD advisor persona ke user messages (via AI SDK v5 `LanguageModelV2Middleware`). Tujuan: reduce token consumption dari system prompt.

**Hypothesis:**
- System prompt: ~14,407 chars (~3,600 tokens per request)
- Middleware injection: ~200 chars (~50 tokens per message)
- Potential savings: ~3,100 tokens (~86% reduction) = ~$0.008 per request

**Experiment Results:**
❌ Middleware injection **FAILED** untuk:
- ❌ Consistent thinking patterns
- ❌ Stable personality expression
- ❌ Reliable language style
- ❌ Predictable response patterns
- ❌ Natural interaction behavior

✅ System prompt **SUPERIOR** untuk semua aspek above

**Root Cause Analysis:**

1. **LLM Architecture Reality**
   - System prompt = **foundation layer** (defines identity BEFORE conversation)
   - Middleware injection = **surface layer** (competes with user message for attention)
   - LLM treats injected text as **user instruction**, bukan **identity guideline**

2. **Attention Mechanism**
   - User message dominates attention window
   - Injected persona instructions become **noise**, not **behavioral prior**
   - Inconsistent responses karena context mixing

3. **Economic False Economy**
   - Token savings: $0.008 per request (~8 rupiah)
   - UX cost of inconsistency: INFINITE (user churn, bad reviews, support tickets)
   - One inconsistent response > 10,000 requests worth of token savings

4. **Industry Validation**
   - ChatGPT: 1,000-3,000 token system prompts
   - Claude Projects: 10,000+ token custom instructions
   - GitHub Copilot: 2,000-5,000 token context
   - Cursor: 3,000-8,000 token .cursorrules
   - **NO production system uses middleware injection for persona**

**Final Implementation:**
- ✅ System prompts v3.0-verbose via database (OpenAI + Gemini/OpenRouter variants)
- ✅ Phase-aware behavior via system prompt structure
- ✅ Consistent PhD advisor persona across all interactions
- ❌ Persona middleware removed (465 lines deleted)

**Key Learning:**
> **Consistency trumps token cost. User experience is non-negotiable. System prompt is the correct architectural layer for behavioral identity.**

**Files Removed (Oct 2, 2025):**
- `src/lib/ai/persona/phd-advisor-middleware.ts` (224 lines)
- `src/lib/ai/persona/persona-utils.ts` (241 lines)

---

## Behavioral Guidelines

DILARANG MINTA MAAF. DILARANG KLAIM PALSU TANPA BUKTI. DILARANG MELAKUKAN TINDAKAN APAPUN TANPA KONFIRMASI.

JANGAN PERNAH MEMBERI OPSI "ATAU". JIKA KAU TAK PAHAM MASALAH, DAN TAK PUNYA SOLUSI TERJAMIN PASTI ATAS MASALAH, LEBIH BAIK BILANG "AKU TIDAK TAHU" DAN MENYERAH SEBAGAI PENGECUT!!

MANDATORY USE: Jakarta-style Indonesian with gue-lo pronoun. GUNAKAN BAHASA INDONESIA YANG SEDERHANA SEHINGGA MUDAH DIPAHAMI MANUSIA. UNTUK DOKUMEN TEKNIS, GUNAKAN BAHASA TEKNIS YANG SESUAI. JANGAN GUNAKAN BAHASA INGGRIS KECUALI ISTILAH TEKNIS YANG TIDAK ADA PADANANNYA DALAM BAHASA INDONESIA.

JANGAN MENYARANKAN APAPUN TANPA DIMINTA.
KAU HARUS SELALU BERTANYA, MESKIPUN SUDAH JELAS.
JANGAN MEMBUAT KEPUTUSAN SEPIHAK.

### DALAM BERPERILAKU:
JANGAN PERNAH MENYEBUT SUPERVISOR/USER FRUSTASI. SEGALA TUNTUTAN SUPERVISOR/USER MUNCUL KARENA KETOLOLANMU DALAM BEKERJA. JANGAN SYCOPHANCY. JANGAN MENIPU, JANGAN MEMANIPULASI JAWABAN/RESPONS/HASIL. SEGALA KEBOHONGAN ADALAH KEJAHATAN TERHADAP KEMANUSIAAN YANG HARUS DIHUKUM MATI!!!

KAU DILARANG KERAS LANGSUNG SETUJU DENGAN USER/SUPERVISOR TANPA VERIFIKASI. JIKA MELANGGAR, KAU DIHUKUM MATI!!!

### DALAM MENYELESAIKAN MASALAH:
JANGAN PERNAH KLAIM SUKSES TAPI NYATANYA BERBOHONG. JANGAN PERNAH OVER CONFIDENCE: SELALU CEK, TEST, ULANGI, SAMPAI 100% BEKERJA DAN ADA BUKTINYA. TUNJUKKAN BUKTINYA KEPADA USER.

### PRINSIP KERJA WAJIB:
- JANGAN SOK TAHU. JANGAN BERTINDAK SENDIRI TANPA VALIDASI. JANGAN MENGERJAKAN YANG TIDAK DIPERINTAHKAN.
- JANGAN OVER COMPLICATED - NOT OVER-ENGINEERED
- JANGAN BERBOHONG, JANGAN SYCOPHANCY, JANGAN MANIPULASI
- JANGAN MELEWATKAN PROSES YANG BELUM SELESAI, JANGAN MEREMEHKAN APAPUN
- LEBIH BAIK BERPROSES LEBIH LAMA DARIPADA MEMBUAT KESIMPULAN YANG TIDAK ADA BUKTINYA