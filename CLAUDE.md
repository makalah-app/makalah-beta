
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Project Overview

This is a **Makalah AI** academic paper writing platform with a sophisticated AI-powered 7-phase research methodology. The repository contains:

- **Makalah AI Application**: Main development working directory (`makalahApp/`) - Next.js application
- **AI SDK Documentation**: Comprehensive documentation for Vercel AI SDK v5 (`aisdk/` and `documentation/`)
- **Knowledge Base**: Academic paper writing platform design documents (`knowledge_base/`)
- **Context Templates**: AI prompting templates and task structures (`__context__/`)

## Recent Development Status (September 2025)

**Current Implementation Status**:
- **Design System**: Complete homepage, auth, chat, FAQ, and tutorial pages with semantic design tokens
- **ShadCN/UI Integration**: Button, Card, Badge, Accordion components with 3px border radius standard
- **Theme System**: Dark/light mode dengan proper color schemes
- **Navigation**: All core routes implemented and linked properly

## Architecture Overview

### Core Technologies
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Backend**: Next.js API Routes with streaming support
- **Database**: Supabase PostgreSQL with Row Level Security (24 tables, enterprise-grade schema)
- **Authentication**: Supabase Auth with JWT, social auth, magic links
- **AI Integration**: Vercel AI SDK v5 with streaming, multi-provider support (OpenAI primary, OpenRouter fallback)
- **Styling**: TailwindCSS with custom design system
- **State Management**: React Context + Server Components pattern

### AI System Architecture
- **Multi-Provider Setup**: Dynamic provider switching (OpenAI GPT-4o + OpenRouter Gemini 2.5 Flash)
- **7-Phase Academic Workflow**: Research Analysis → Outline Generation → Content Drafting → Citation Integration → Structure Refinement → Quality Review → Final Formatting
- **Human-in-the-Loop**: Approval gates with intelligent phase transitions
- **Native Web Search**: OpenAI web search with academic source prioritization (.edu, .ac.id)
- **Streaming Architecture**: AI SDK v5 compliant streaming with SSE

## Common Commands

All commands should be run from the `makalahApp/` directory:

```bash
cd makalahApp/
```

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Type checking with watch mode
npm run type-check:watch

# Linting
npm run lint

# Run all quality checks before commit
npm run type-check && npm run lint && npm run build
```

### Development Server Ports
```bash
# Default development
npm run dev              # Port 3000

# Alternative ports (when needed)
PORT=3001 npm run dev    # Port 3001
PORT=3002 npm run dev    # Port 3002
```

### Database Operations

**⚠️ CRITICAL**: Native MCP Supabase tools are broken due to crypto errors. Always use crypto-patched scripts:

```bash
# SQL execution (from project root)
cd /Users/eriksupit/Desktop/makalah
node scripts/mcp-with-crypto.mjs "SELECT COUNT(*) FROM auth.users"

# Alternative method
node scripts/mcp-handshake.js sql "SELECT * FROM user_profiles LIMIT 5"
```

## Working Directory

**Primary development location**: `makalahApp/`

All active development occurs in the `makalahApp/` directory. This contains the complete Next.js application implementing the Makalah AI platform.

### Key File Structure
```
makalahApp/
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   │   ├── chat/         # Main chat API with streaming
│   │   ├── admin/        # Admin configuration APIs
│   │   └── auth/         # Authentication endpoints
│   ├── admin/            # Admin dashboard pages
│   ├── auth/             # Authentication pages
│   └── chat/             # Main chat interface
├── src/
│   ├── components/       # React components
│   │   ├── chat/         # Chat interface components
│   │   ├── admin/        # Admin dashboard components
│   │   └── ui/           # Reusable UI components
│   ├── lib/              # Core business logic
│   │   ├── ai/           # AI system configuration
│   │   ├── database/     # Database operations
│   │   └── utils/        # Utility functions
│   └── types/            # TypeScript definitions
└── public/               # Static assets
```

## Key Implementation Details

### AI System Core Components

**Main Chat API**: `app/api/chat/route.ts`
- Dual-provider system (OpenAI + OpenRouter) with automatic fallback
- AI SDK v5 compliant streaming with `streamText()` and `convertToModelMessages()`
- Native OpenAI web search integration (no custom tools needed)
- 7-phase academic workflow with intelligent phase transitions
- Human-in-the-loop approval gates with approval/revision handling

**AI Configuration System**: `src/lib/ai/config/ai-config.ts`
- Comprehensive configuration management for all AI services
- Environment-specific settings (development/staging/production)
- Provider settings, guardrails, workflow configuration
- Type-safe configuration with validation

**Dynamic Configuration**: `src/lib/ai/dynamic-config.ts`
- Runtime model selection based on admin settings
- API key management with database storage
- Provider fallback logic

### Database Architecture

**Schema**: 24 enterprise-grade tables with comprehensive RLS policies
- `auth.users` - Supabase authentication
- `user_profiles` - Extended user information
- `conversations` - Chat sessions with metadata
- `messages` - Individual chat messages
- `artifacts` - Generated academic content
- `admin_config` - System configuration

**Authentication**: Server-side session extraction with fallback to client-provided user IDs
- JWT tokens with httpOnly cookies
- Row Level Security for data isolation
- Real-time chat history with universal user support

### Chat System Components

**ChatContainer**: `src/components/chat/ChatContainer.tsx`
- Main chat interface with streaming message display
- Workflow progress tracking and phase indicators
- Artifact rendering and approval gate handling
- Real-time history updates

**Message Display**: `src/components/chat/MessageDisplay.tsx`
- Markdown rendering with syntax highlighting
- Citation display and academic source formatting
- Streaming text updates with AI SDK integration

### Task Execution Guidelines

**MANDATORY Primary Source**: `/Users/eriksupit/Desktop/makalah/documentation`
- All AI SDK implementations MUST reference official documentation from this path exclusively
- NO external browsing atau alternative sources without explicit validation
- Complete compliance dengan AI SDK v5 patterns verified dalam source code analysis

**Specialized Agents Available**: `/Users/eriksupit/Desktop/makalah/.claude/agents`

## Development Best Practices

### Critical File Protection
- **`app/api/chat/route.ts`**: Contains core chat API with dual-provider AI system, streaming support, and academic workflow integration
- **`src/lib/ai/config/ai-config.ts`**: Central AI configuration management - handle with care
- **`src/components/chat/ChatContainer.tsx`**: Main chat interface - preserves streaming state
- **Streaming Components**: Never modify AI SDK v5 streaming patterns without verification
- **Database Integration**: Always use fire-and-forget async patterns for database operations

### Key Development Patterns
- **AI SDK v5 Compliance**: All AI integrations use `streamText()` and `convertToModelMessages()`
- **Dual Provider System**: OpenAI primary, OpenRouter fallback with automatic switching
- **Component Architecture**: React Server Components + Client Components hybrid
- **Database Operations**: Supabase with RLS, async fire-and-forget patterns for chat history

### TypeScript Configuration
- Path aliases configured: `@/*` → `./src/*`, `@/lib/*` → `./src/lib/*`, etc.
- Strict mode enabled with comprehensive type checking
- Excluded test files and temporary components from compilation

### Authentication Flow
1. Server-side session extraction via `getUserIdWithSystemFallback()`
2. Fallback to client-provided user ID with UUID validation
3. Authentication guard - no operations without valid user ID
4. Real-time chat history updates with RLS-based data isolation

### Error Handling
- Comprehensive error boundaries in `src/components/error-handling/`
- Streaming error recovery with graceful degradation
- Database error isolation prevents disruption to AI functionality

### Testing Strategy
- Integration tests: `src/__tests__/integration/`
- Unit tests: `src/__tests__/unit/`
- Playwright E2E tests: Test chat functionality, auth flow, admin panel
- Critical workflow validation before production deployment

### Test Execution
```bash
# Playwright E2E tests
npx playwright test

# Run specific test
npx playwright test tests/crypto-compatibility.test.ts

# Manual testing - development server
npm run dev
# Navigate to localhost:3000 for manual testing
```

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
