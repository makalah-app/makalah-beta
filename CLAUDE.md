# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Makalah AI** - an enterprise-grade academic research platform powered by AI with a sophisticated 7-phase research methodology. Built with Next.js 14, AI SDK v5, and Supabase, it provides an advanced academic writing assistant for Indonesian users.

## **🎯 MANDATORY DEVELOPMENT FRAMEWORK REFERENCES**

### **CRITICAL REQUIREMENT - 100% COMPLIANCE MANDATORY**

**ALL development work MUST strictly follow these authoritative references. NO EXCEPTIONS.**

### **📚 Technical Implementation References**

**1. AI SDK Implementation Authority**
- **Primary Source**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/`
- **Documentation**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/documentation/`
- **MANDATORY**: All coding, modules, refactoring, and technical implementation MUST be 100% compliant with AI SDK patterns from these directories
- **Protocol**: ALWAYS search solutions in AI SDK references FIRST before any implementation

**2. Design & Visual Standards**
- **Design Mockups**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/design/`
- **Usage**: Complete visualization guidelines and layout standards
- **Compliance**: All UI/UX must match established design patterns

**3. AI Elements & Components**
- **AI Elements Source**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk-elements/elements/`
- **Scope**: Chat page components, AI interactions, and element patterns
- **Requirement**: 100% compliance with AI SDK Elements standards

### **🎨 UI Framework Integration**

**ShadCN/UI Component System**
- **Access Method**: MCP ShadCN/UI via `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/.mcp.json`
- **Integration**: Use `mcp__shadcn__*` tools for component management
- **Standards**: All UI elements MUST use ShadCN/UI + AI SDK Elements compliance

### **🚫 STRICT PROHIBITIONS**

**FORBIDDEN PRACTICES:**
- ❌ **NO hardcoded custom styling in code**
- ❌ **NO deviation from AI SDK v5 patterns**
- ❌ **NO custom UI components without ShadCN/UI base**
- ❌ **NO design implementations that bypass established mockups**

### **✅ MANDATORY WORKFLOW**

**For ANY technical problem:**
1. **FIRST**: Search solution in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/`
2. **SECOND**: Check documentation in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/documentation/`
3. **THIRD**: Verify design compliance with `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/design/`
4. **FOURTH**: Use ShadCN/UI via MCP tools for components
5. **FINALLY**: Implement with 100% compliance to established patterns

**VIOLATION OF THIS FRAMEWORK RESULTS IN:**
- ❌ Rejected implementations
- ❌ Mandatory refactoring requirements
- ❌ Complete restart of development work

**ADHERENCE TO THIS FRAMEWORK ENSURES:**
- ✅ Production-ready code quality
- ✅ Consistent user experience
- ✅ Maintainable and scalable architecture
- ✅ Full compatibility with AI SDK v5 ecosystem

---

## Core Architecture

### Technology Stack
- **Frontend**: Next.js 14 App Router, React 18, TypeScript 5.4+
- **AI Integration**: Vercel AI SDK v5 with dual-provider architecture (OpenAI primary, OpenRouter fallback)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Styling**: TailwindCSS with custom design system and ShadCN/UI components
- **Authentication**: Supabase Auth with JWT tokens

### Key Features
- **Dual Provider AI System**: Dynamic switching between OpenAI GPT-4o and OpenRouter providers
- **Native Web Search**: OpenAI web search integration (no mock data)
- **7-Phase Academic Workflow**: Structured research methodology from topic clarification to final formatting
- **Real-time Streaming**: AI SDK v5 compliant streaming with smooth token delivery
- **Multi-language Support**: Primary focus on Indonesian academic standards

## Common Development Commands

### Development Server
```bash
# Start development server (default port 3000)
npm run dev

# Alternative ports if needed
PORT=3001 npm run dev
PORT=3002 npm run dev
```

### Build & Quality Checks
```bash
# Type checking
npm run type-check
npm run type-check:watch

# Linting
npm run lint

# Production build
npm run build

# Start production server
npm run start

# Run all quality checks (recommended before commits)
npm run type-check && npm run lint && npm run build
```

### Testing
```bash
# Unit tests with Jest
npm test

# E2E tests with Playwright
npx playwright install  # First time setup
npx playwright test
npx playwright test --ui  # Interactive mode

# Specific test file
npx playwright test tests/chat-workflow.spec.ts
```

## Architecture Deep Dive

### AI System Core (`app/api/chat/route.ts`)
The heart of the application is a sophisticated dual-provider AI system:

- **Primary Provider**: Configurable via database (default: OpenAI GPT-4o with native web search)
- **Fallback Provider**: Automatic fallback to OpenRouter when primary fails
- **AI SDK v5 Compliance**: Uses `streamText()`, `convertToModelMessages()`, and `createUIMessageStream()`
- **Streaming Architecture**: Real-time response streaming with `smoothStream()` for word-by-word delivery
- **Authentication Guard**: Requires valid user ID for all operations (no anonymous fallbacks)

### Dynamic Configuration System (`src/lib/ai/dynamic-config.ts`)
- Runtime model selection based on admin settings stored in database
- Provider health monitoring and automatic failover
- System prompt management via database (no hardcoded prompts)
- API key management with encrypted storage

### Database Architecture
**24+ Tables** with comprehensive Row Level Security:
- `auth.users` - Supabase authentication
- `user_profiles` - Extended user information
- `conversations` - Chat sessions with metadata
- `messages` - Individual chat messages
- `admin_config` - System configuration
- `workflows` - Academic workflow tracking

### Message Processing Flow
1. **Authentication**: Extract user ID from session or client headers
2. **Message Validation**: Convert to AI SDK v5 UIMessage format
3. **Model Selection**: Dynamic provider selection from database config
4. **Streaming**: AI SDK v5 streaming with tool calling support
5. **Persistence**: Async database operations (fire-and-forget pattern)

### TypeScript Configuration
- **Path Aliases**: `@/*` → `./src/*`, `@/lib/*` → `./src/lib/*`
- **Strict Mode**: Comprehensive type checking enabled
- **Excluded Files**: Test files and temporary components excluded from compilation

## Critical Implementation Patterns

### AI SDK v5 Compliance
All AI interactions must use official AI SDK v5 patterns:
```typescript
import { streamText, convertToModelMessages, createUIMessageStream } from 'ai';

// Message conversion (CRITICAL for compatibility)
const modelMessages = convertToModelMessages(uiMessages);

// Streaming setup
const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    const result = streamText({
      model: dynamicConfig.primaryModel,
      messages: modelMessages,
      tools: webSearchTools,
    });

    writer.merge(result.toUIMessageStream());
  }
});
```

### Database Operations Protocol
**CRITICAL**: Native MCP Supabase tools are broken due to crypto errors. Always use crypto-patched scripts:

```bash
# NEVER use these (broken):
# mcp__supabase__execute_sql
# mcp__supabase__apply_migration

# ALWAYS use crypto-patched scripts:
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM auth.users"
node scripts/mcp-with-crypto.mjs "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
```

### Error Handling Patterns
- **Streaming Error Recovery**: Graceful degradation with fallback providers
- **Authentication Guards**: No anonymous operations allowed
- **Database Resilience**: Fire-and-forget async patterns prevent blocking AI responses

## Component Architecture

### Core Chat Components
- **ChatContainer** (`src/components/chat/ChatContainer.tsx`): Main chat interface with streaming
- **MessageDisplay** (`src/components/chat/MessageDisplay.tsx`): Markdown rendering with syntax highlighting
- **StreamingHandler**: Real-time message streaming management

### Admin Dashboard
- **ProviderSelector** (`src/components/admin/ProviderSelector.tsx`): Dynamic AI provider configuration
- **System Configuration**: Real-time model parameter tuning via database

### UI Components
- **ShadCN/UI Integration**: Use `npx shadcn@latest add [component]` to add new components
- **Design System**: 3px border radius standard, semantic color tokens
- **Responsive Design**: Mobile-first with TailwindCSS breakpoints

## Development Guidelines

### Code Standards
- **TypeScript Strict**: All code must pass type checking
- **No Hardcoded Values**: Use database configuration for all AI settings
- **Async Patterns**: Database operations should be fire-and-forget to avoid blocking streams
- **Error Boundaries**: Comprehensive error handling without disrupting user experience

### Testing Requirements
- **Unit Tests**: Jest with React Testing Library
- **Integration Tests**: API route testing with Supabase
- **E2E Tests**: Playwright for complete user workflows
- **Quality Gates**: All tests must pass before deployment

### Security Considerations
- **Authentication Required**: No anonymous operations
- **Row Level Security**: All database queries enforce user isolation
- **API Key Management**: Encrypted storage of provider credentials
- **Input Validation**: Zod schemas for all API inputs

## Environment Configuration

### Required Environment Variables
```bash
# Primary AI Provider
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
PRIMARY_MODEL=gpt-4o

# Fallback Provider
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxx
FALLBACK_MODEL=google/gemini-2.5-flash

# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Development Setup
1. **Dependencies**: `npm install`
2. **Environment**: Copy `.env.example` to `.env.local`
3. **Database**: Ensure Supabase project is configured
4. **MCP Scripts**: Verify crypto-patched scripts work: `node scripts/mcp-with-crypto.mjs "SELECT 1"`

## Deployment Considerations

### Production Readiness
- **Build Validation**: `npm run build` must succeed
- **Type Safety**: `npm run type-check` must pass
- **Linting**: `npm run lint` must pass clean
- **Environment Variables**: All production API keys configured
- **Database Migrations**: Supabase schema up to date

### Performance Optimization
- **Streaming Architecture**: Word-by-word token delivery with 35ms delay
- **Caching Strategy**: Next.js static generation where appropriate
- **Database Indexes**: Optimized queries for chat history
- **Error Recovery**: Graceful fallback between AI providers

## Troubleshooting Common Issues

### MCP Database Errors
```bash
# Error: crypto is not defined
# Solution: Use crypto-patched script
node scripts/mcp-with-crypto.mjs "YOUR_SQL_QUERY"
```

### AI SDK v5 Message Conversion Errors
```typescript
// Always use convertToModelMessages for proper tool part handling
const modelMessages = convertToModelMessages(uiMessages);
```

### Streaming Connection Issues
- Check network connectivity
- Verify API keys are valid
- Ensure proper CORS headers in Next.js config
- Monitor provider health endpoints

### Authentication Problems
- Verify Supabase configuration
- Check JWT token validity
- Ensure RLS policies are active
- Validate user session extraction

## Key Files to Understand

- **`app/api/chat/route.ts`**: Core AI chat API with dual providers and streaming
- **`src/lib/ai/dynamic-config.ts`**: Dynamic model configuration system
- **`src/lib/database/supabase-server-auth.ts`**: Authentication and session management
- **`app/layout.tsx`**: Root layout with providers and theme system
- **`next.config.js`**: Next.js configuration with webpack optimizations
- **`tailwind.config.ts`**: Design system configuration

## Behavioral Guidelines

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

---

## **🚨 MANDATORY MCP SUPABASE OPERATIONS PROTOCOL**

### **CRITICAL REQUIREMENT - NO EXCEPTIONS**

**ALL Supabase SQL operations MUST use crypto-patched scripts. Native MCP tools BROKEN dengan crypto errors.**

### **MANDATORY COMMANDS FOR DATABASE OPERATIONS**

**❌ NEVER USE (BROKEN - crypto undefined error):**
```
mcp__supabase__execute_sql
mcp__supabase__apply_migration
```

**✅ ALWAYS USE (WORKING - crypto polyfill included):**
```bash
# SQL execution with crypto polyfill
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM users"
node scripts/mcp-with-crypto.mjs "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
node scripts/mcp-with-crypto.mjs "SELECT id, email FROM auth.users LIMIT 5"

# Fallback script (alternative)
node scripts/mcp-handshake.js sql "SELECT COUNT(*) FROM users"
```

### **TROUBLESHOOTING MCP CRYPTO ERRORS**

**If encountering "crypto is not defined" error:**

1. **STOP using native MCP tools immediately**
2. **SWITCH to crypto-patched scripts:**
   ```bash
   node scripts/mcp-with-crypto.mjs "YOUR_SQL_QUERY"
   ```
3. **Verify crypto polyfill injection in output:**
   ```
   🔧 Injecting crypto polyfill...
   ✅ Crypto polyfill injected successfully
   ```

### **DEVELOPMENT WORKFLOW REQUIREMENTS**

**For database verification tasks:**
```bash
# User count check
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM auth.users"

# Table structure inspection  
node scripts/mcp-with-crypto.mjs "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'"

# Data validation
node scripts/mcp-with-crypto.mjs "SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10"

# Schema overview
node scripts/mcp-with-crypto.mjs "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
```

### **SUCCESS INDICATORS**

**Working execution shows:**
```
🔧 Injecting crypto polyfill...
✅ Crypto polyfill injected successfully  
🔌 Connecting to MCP server with crypto support...
🏃 Executing SQL with crypto polyfill: [QUERY]
📊 Result: [DATA]
✅ MCP SQL execution with crypto polyfill successful!
```

**❌ FAILURE PATTERN TO AVOID:**
```
{"error":{"name":"ReferenceError","message":"crypto is not defined"}}
```

### **MANDATORY COMPLIANCE**

**VIOLATION OF THIS PROTOCOL RESULTS IN:**
- ❌ Wasted development time dengan crypto errors
- ❌ Broken database verification workflows  
- ❌ Failed SQL operations dan blocked progress

**ADHERENCE TO THIS PROTOCOL ENSURES:**
- ✅ Reliable database operations
- ✅ Consistent development workflow
- ✅ No crypto-related interruptions
- ✅ Immediate SQL execution success

**THIS IS NON-NEGOTIABLE. ALWAYS USE CRYPTO-PATCHED SCRIPTS FOR MCP SUPABASE OPERATIONS.**

### **COMPREHENSIVE TROUBLESHOOTING GUIDE**

**📋 Common Error Patterns & Solutions:**

**1. Crypto Undefined Error**
```
Error: {"error":{"name":"ReferenceError","message":"crypto is not defined"}}
```
**Solution**: IMMEDIATELY stop using native MCP tools, switch to:
```bash
node scripts/mcp-with-crypto.mjs "YOUR_SQL_QUERY"
```

**2. Script Not Found**
```
Error: Cannot find module 'scripts/mcp-with-crypto.mjs'
```
**Solution**: Ensure working directory adalah project root:
```bash
cd /Users/eriksupit/Desktop/makalah
node scripts/mcp-with-crypto.mjs "SELECT 1"
```

**3. Permission Denied**
```
Error: permission denied for table users
```
**Solution**: Use proper table names:
```bash
# CORRECT - auth schema
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM auth.users"

# CORRECT - public schema
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM user_profiles"
```

**4. MCP Server Connection Failed**
```
Error: Failed to connect to MCP server
```
**Solution**: Verify configuration:
```bash
# Check .mcp.json exists dan valid
cat .mcp.json | jq .

# Test basic connectivity
node scripts/mcp-handshake.js list-tools
```

**5. SQL Syntax Errors**
```
Error: 42703: column "role" does not exist
```
**Solution**: Check table structure first:
```bash
node scripts/mcp-with-crypto.mjs "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles'"
```

**📊 VERIFICATION COMMANDS**

**Quick health check:**
```bash
# 1. Verify crypto polyfill working
node scripts/crypto-environment-patch.mjs

# 2. Test basic SQL execution
node scripts/mcp-with-crypto.mjs "SELECT 1 as test"

# 3. Check user count
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM auth.users"

# 4. Verify table access
node scripts/mcp-with-crypto.mjs "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5"
```

**If ALL commands fail:**
1. Check Node.js version: `node --version` (requires >= 18.x)
2. Verify project directory: `pwd` should be `/Users/eriksupit/Desktop/makalah`
3. Check file permissions: `ls -la scripts/mcp-with-crypto.mjs`
4. Test MCP configuration: `node scripts/mcp-handshake.js list-tools`

**📝 DOCUMENTATION REFERENCES**

- **Detailed Guide**: `scripts/README-MCP-CRYPTO.md`
- **Script Source**: `scripts/mcp-with-crypto.mjs`
- **Environment Patch**: `scripts/crypto-environment-patch.mjs`
- **Configuration**: `.mcp.json`

**🔄 EMERGENCY RECOVERY**

**If crypto-patched scripts corrupted atau missing:**
```bash
# Recreate environment patch
node -e "
import crypto from 'crypto';
const api = {
  getRandomValues: (arr) => { const b = crypto.randomBytes(arr.length); for(let i=0; i<arr.length; i++) arr[i] = b[i]; return arr; },
  randomUUID: () => crypto.randomUUID()
};
global.crypto = api;
console.log('Manual crypto polyfill injected');
"

# Use fallback MCP script
node scripts/mcp-handshake.js sql "SELECT COUNT(*) FROM auth.users"
```

## Authentication & Testing

### **Authentication Credentials** 🔐
```
Admin:  makalah.app@gmail.com / M4k4l4h2025
User 1: 1200pixels@gmail.com / M4k4l4h2025
User 2: posteriot@gmail.com / M4k4l4h2025
```

### **System Configuration**
- **System Prompt Management**: Database Supabase (access via `/admin` → "system prompt")
- **Fallback Configuration**: Hardcoded di `app/admin/page.tsx`
- **Admin Interface**: Frontend `/admin` interface for system management

## ShadCN UI Components

### Adding New Components
```bash
# Add individual components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add accordion

# Components follow 3px border radius standard
# All styling uses semantic design tokens (bg-background, text-foreground, etc.)
```
---

**MANDATORY Primary Source**: `/Users/eriksupit/Desktop/makalah/documentation`
- All AI SDK implementations MUST reference official documentation from this path exclusively
- NO external browsing atau alternative sources without explicit validation
- Complete compliance dengan AI SDK v5 patterns verified dalam source code analysis

---

This repository implements a production-ready academic AI platform with sophisticated error handling, dual provider architecture, and real-time streaming capabilities. Always prioritize user experience, data security, and system reliability when making changes.