# Repository Guidelines

## **🎯 MANDATORY DEVELOPMENT FRAMEWORK REFERENCES**

### **CRITICAL REQUIREMENT - 100% COMPLIANCE MANDATORY**

**ALL agent operations MUST strictly follow these authoritative references. NO EXCEPTIONS.**

### **📚 Technical Implementation References**

**1. AI SDK Implementation Authority**
- **Primary Source**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/`
- **Documentation**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/documentation/`
- **MANDATORY**: All coding, modules, refactoring, and technical implementation MUST be 100% compliant with AI SDK patterns from these directories
- **Agent Protocol**: ALWAYS search solutions in AI SDK references FIRST before any implementation
- **Examples**: Use `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/examples/` for implementation patterns

**2. Design & Visual Standards**
- **Design Mockups**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/design/`
- **Usage**: Complete visualization guidelines and layout standards for all UI work
- **Agent Compliance**: All UI/UX implementations must match established design patterns
- **Structure**: App-specific designs in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/design/app/`

**3. AI Elements & Components**
- **AI Elements Source**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk-elements/elements/`
- **Scope**: Chat page components, AI interactions, streaming elements, and UI patterns
- **Agent Requirement**: 100% compliance with AI SDK Elements standards for all chat-related work
- **Integration**: Must work seamlessly with existing AI SDK v5 streaming architecture

### **🤖 Agent-Specific UI Framework Integration**

**ShadCN/UI Component System**
- **Access Method**: MCP ShadCN/UI via `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/.mcp.json`
- **Agent Integration**: Use `mcp__shadcn__*` tools for component discovery and management
- **Standards**: All agent-generated UI elements MUST use ShadCN/UI + AI SDK Elements compliance
- **Workflow**: Search → View → Add components using MCP tools before implementation

### **🚫 AGENT PROHIBITIONS**

**FORBIDDEN PRACTICES FOR ALL AGENTS:**
- ❌ **NO hardcoded custom styling in code implementations**
- ❌ **NO deviation from AI SDK v5 patterns in any technical work**
- ❌ **NO custom UI components without ShadCN/UI base**
- ❌ **NO design implementations that bypass established mockups**
- ❌ **NO external documentation sources without explicit validation**

### **✅ MANDATORY AGENT WORKFLOW**

**For ANY technical problem that agents encounter:**
1. **FIRST**: Search solution in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/`
2. **SECOND**: Check documentation in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/documentation/`
3. **THIRD**: Verify design compliance with `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/design/`
4. **FOURTH**: Use ShadCN/UI MCP tools for component management
5. **FIFTH**: Check AI SDK Elements for UI patterns in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk-elements/elements/`
6. **FINALLY**: Implement with 100% compliance to established patterns

**AGENT VIOLATION OF THIS FRAMEWORK RESULTS IN:**
- ❌ Rejected agent implementations
- ❌ Mandatory refactoring requirements
- ❌ Complete restart of agent development work

**AGENT ADHERENCE TO THIS FRAMEWORK ENSURES:**
- ✅ Production-ready code quality from all agents
- ✅ Consistent user experience across agent implementations
- ✅ Maintainable and scalable architecture
- ✅ Full compatibility with AI SDK v5 ecosystem

---

## Project Structure & Module Organization
MakalahApp organizes Next.js routes inside `app/` (chat, tutorial, admin, api). Shared React pieces, hooks, and utilities live in `src/`. Put static assets under `public/`, and reference docs in `docs/` or `documentation/`. Test harnesses sit in `tests/` and `test-utils/`, while CLI helpers—including MCP scripts—reside in `scripts/`.

## Build, Test, and Development Commands
Use `npm run dev` to launch the local server at http://localhost:3000. `npm run build` compiles a production bundle; follow with `npm run start` to verify artifacts. Run `npm run lint` and `npm run type-check` before any PR. For coverage or regression sweeps, call `npx jest --coverage`. Execute `npx playwright test` for E2E; install browsers once via `npx playwright install`.

## Coding Style & Naming Conventions
We write TypeScript and React 18 with two-space indentation and ~100 character lines. Components follow PascalCase (`src/components/GlobalHeader.tsx`), hooks use camelCase (e.g., `useThemeToggle`), and shared modules adopt kebab-case (`src/lib/api-client.ts`). Always let ESLint and Prettier format saves; avoid non-ASCII unless the file already uses it.

## Testing Guidelines
Place Jest specs alongside source as `*.test.tsx` or in `src/__tests__/`. Jest setup is centralized in `jest.setup.js`; keep tests deterministic and update snapshots when logic changes. Aim for meaningful coverage reviews using `npx jest --coverage` and stabilize flaky cases before merging. Run Playwright suites after significant UI or data flow updates.

## Commit & Pull Request Guidelines
Adopt Conventional Commits such as `feat: add onboarding tips` or `fix: handle null session`. PRs should summarize scope, link issues, and document validation (`npm run lint`, `npm run type-check`, relevant tests). Include screenshots or recordings for UI-impacting changes and wait for CI to pass before merge.

## Security & Configuration Tips
Copy `.env.local.example` to `.env.local` and keep Supabase or Upstash secrets private. Ensure port 3000 is free before E2E runs. When applying SQL, use `node scripts/mcp-with-crypto.mjs "<SQL>"` to preserve the crypto polyfill and respect Supabase RLS policies in data access.

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

**MANDATORY Primary Source**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk/documentation/`
- All AI SDK implementations MUST reference official documentation from this path exclusively
- NO external browsing atau alternative sources without explicit validation
- Complete compliance dengan AI SDK v5 patterns verified dalam source code analysis
- Additional references: Design mockups in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/design/` and AI Elements in `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/aisdk-elements/elements/`