# Workflow Knowledge Base

**Version**: 1.0
**Created**: 2025-10-10
**Purpose**: Semantic phase detection for academic paper workflow system
**Total Files**: 26 markdown files (~3900 tokens)

---

## Overview

This knowledge base provides natural language descriptions of the 11-phase academic paper writing workflow for **Makalah AI**. It enables semantic similarity search to replace brittle regex-based phase detection, allowing the system to understand infinite language variations (dialects, slang, typos, code-switching) without code maintenance.

**Key Characteristics**:
- ✅ **Language Coverage**: Indonesian (formal + colloquial), English, Jakarta slang, Gen Z terms
- ✅ **Variation Handling**: Typos, abbreviations, code-switching, regional dialects
- ✅ **Embedding-Ready**: Designed for OpenAI text-embedding-ada-002 (1536 dimensions)
- ✅ **Scalable**: Handles infinite user expression variations without regex pattern updates

---

## Directory Structure

```
knowledge_base/workflow/
├── README.md                    # This file
├── phase_definitions/           # 11 files (1 per phase)
│   ├── 01_exploring.md
│   ├── 02_topic_locked.md
│   ├── 03_researching.md
│   ├── 04_foundation_ready.md
│   ├── 05_outlining.md
│   ├── 06_outline_locked.md
│   ├── 07_drafting.md
│   ├── 08_drafting_locked.md
│   ├── 09_integrating.md
│   ├── 10_polishing.md
│   └── 11_delivered.md
├── transitions/                 # 10 files (1 per transition)
│   ├── 01_exploring_to_topic_locked.md
│   ├── 02_topic_locked_to_researching.md
│   ├── 03_researching_to_foundation_ready.md
│   ├── 04_foundation_ready_to_outlining.md
│   ├── 05_outlining_to_outline_locked.md
│   ├── 06_outline_locked_to_drafting.md
│   ├── 07_drafting_to_drafting_locked.md
│   ├── 08_drafting_locked_to_integrating.md
│   ├── 09_integrating_to_polishing.md
│   └── 10_polishing_to_delivered.md
└── artifacts/                   # 5 files (1 per artifact type)
    ├── topic_summary.md
    ├── research_question.md
    ├── references.md
    ├── outline.md
    └── keywords.md
```

---

## File Format

Each markdown file contains:

1. **Frontmatter** (YAML metadata):
   - `phase`: Phase identifier (e.g., "exploring", "topic_locked")
   - `index`: Phase index (0-10)
   - `progress`: Progress percentage (0.05-1.00)
   - `chunk_type`: Type of content ("phase_definition", "transition", "artifact")

2. **Content Sections**:
   - **Description**: What this phase/transition/artifact represents
   - **Natural Language Indicators**: User expressions that signal this phase
   - **Model Behavior**: Expected AI behavior in this context
   - **Exit Criteria** / **Trigger Conditions**: When to transition
   - **Common Variations**: Dialect, slang, typo variations

**Token Count**: Each file is 150-200 tokens (optimized for embedding quality and token efficiency)

---

## 11-Phase Workflow

| # | Phase | Progress | Description |
|---|-------|----------|-------------|
| 1 | exploring | 5% | Brainstorming topics, no commitment yet |
| 2 | topic_locked | 15% | Topic and research questions confirmed |
| 3 | researching | 25% | Active literature search and reference gathering |
| 4 | foundation_ready | 35% | Sufficient references (≥5-8 sources) gathered |
| 5 | outlining | 45% | Structuring paper into sections (IMRaD/thesis format) |
| 6 | outline_locked | 55% | Structure approved, ready to write content |
| 7 | drafting | 65% | Writing section content (Abstract, Intro, Methods, etc.) |
| 8 | drafting_locked | 75% | All sections drafted and approved |
| 9 | integrating | 85% | Connecting sections into coherent manuscript |
| 10 | polishing | 95% | Final quality refinement (grammar, citations, formatting) |
| 11 | delivered | 100% | Paper complete and submission-ready |

---

## Use Cases

### 1. Phase Detection (Backend Only)
**Purpose**: Determine current workflow phase from user message
**Mechanism**: Semantic similarity search against `phase_definitions/` files
**Frequency**: Every user message
**Token Cost**: Embedding only (~$0.000005 per message)

**Example**:
```typescript
// User message: "Aku mau mulai riset nih"
// Embedding search → Match: 03_researching.md (similarity: 0.82)
// Result: researching
```

### 2. Transition Validation (Backend Only)
**Purpose**: Confirm if transition is valid based on user signal
**Mechanism**: Search against `transitions/` files to validate user intent
**Frequency**: When phase change is detected

**Example**:
```typescript
// User: "Oke, topik sudah fix"
// Search transitions/ → Match: 01_exploring_to_topic_locked.md
// Validate: current_phase = exploring → valid transition to topic_locked
```

### 3. Artifact Extraction Context (Future Enhancement)
**Purpose**: Guide LLM on what artifacts to extract from conversation
**Mechanism**: Inject artifact definitions as context when needed
**Frequency**: Conditional (when artifact quality is unclear)

---

## Semantic Detection Architecture

### How It Works

```
User Message: "Gue pengen nulis paper tentang AI bias"
    ↓
Generate embedding (text-embedding-ada-002)
    ↓
Search workflow_knowledge table (pgvector)
    ↓
Match: 01_exploring.md (similarity: 0.85)
    ↓
Apply guardrails (max +1 phase transition)
    ↓
Result: exploring
```

### Database Integration

**Table**: `workflow_knowledge`
- Columns: `id`, `chunk_type`, `phase`, `title`, `content`, `embedding` (vector 1536), `metadata`
- Indexes: IVFFlat index on `embedding` for fast similarity search
- Function: `match_workflow_chunks()` for similarity search with filters

**Embedding Pipeline**:
1. Read all 26 markdown files
2. Extract content (excluding frontmatter)
3. Generate embeddings via OpenAI API
4. Store in `workflow_knowledge` table with metadata

---

## Language Coverage

### Indonesian Variations
- **Formal**: "Saya ingin membahas topik...", "Penelitian ini berfokus pada..."
- **Colloquial**: "Aku mau bikin paper tentang...", "Gue pengen nulis..."
- **Jakarta Slang**: "Gue lagi nyari topik nih", "Lu cari referensi dong"
- **Gen Z**: "Topik gue udah fix", "Let's gas ke research"

### English Variations
- **Formal**: "I would like to explore topics about...", "Let's begin the literature review"
- **Casual**: "Can you help me find a topic?", "Let's write the intro"
- **Code-Switching**: "Aku mau research tentang AI", "Mari outline this paper"

### Typo & Abbreviation Handling
- **Typos**: "topick", "penelitean", "refrensi", "literatur"
- **Abbreviations**: "riset", "ref", "lit review", "draft"
- **Misspellings**: "eksplorsi", "brainstrom", "outlne", "drfting"

---

## Maintenance Guidelines

### Adding New Language Variations
1. Edit relevant phase/transition/artifact file
2. Add new expressions to "Natural Language Indicators" section
3. Re-generate embeddings for updated file
4. Update `workflow_knowledge` table entry

**No code changes required** - embedding handles semantic similarity automatically.

### Token Count Guidelines
- **Target**: 150-200 tokens per file
- **Validation**: `wc -w < filename.md` (aim for 150-200 words)
- **Why**: Optimal embedding quality without redundancy

### Frontmatter Requirements
All files MUST have valid YAML frontmatter:
- Phase definitions: `phase`, `index`, `progress`, `chunk_type`
- Transitions: `from_phase`, `to_phase`, `chunk_type`
- Artifacts: `artifact_type`, `required_phases`, `chunk_type`

---

## Implementation Roadmap

This knowledge base is part of **Phase 3: Semantic Detection (RAG Tier 1)** in the workflow implementation roadmap.

**Timeline**: 2 weeks
**Tasks**:
1. ✅ **Task 3.1**: Knowledge Base Creation (3 days) - **COMPLETED**
2. ⏳ **Task 3.2**: Database Setup (2 days) - pgvector, table creation
3. ⏳ **Task 3.3**: Embedding Pipeline (2 days) - Generate and store embeddings
4. ⏳ **Task 3.4**: Backend Integration (4 days) - Replace regex with semantic search
5. ⏳ **Task 3.5**: Migration & Rollout (3 days) - Shadow mode, A/B testing, gradual rollout

**Success Criteria**:
- ✅ Phase detection accuracy ≥95%
- ✅ Latency increase <100ms (p95)
- ✅ Zero production incidents during rollout
- ✅ Handles regional dialects without code changes

---

## Related Documentation

- **Implementation Guide**: `__references__/workflow/documentation/workflow_infrastructure/workflow_task/phase_03/task_3-1_knowledge_base_creation.md`
- **Semantic Detection Spec**: `__references__/workflow/documentation/workflow_infrastructure/04_proposed_improvements/semantic_detection.md`
- **Workflow Infrastructure**: `__references__/workflow/documentation/workflow_infrastructure/CLAUDE.md`
- **Current Phase Detection**: `src/lib/ai/workflow-inference.ts` (regex-based, to be replaced)

---

## Validation Status

✅ **26 files created** (11 phases + 10 transitions + 5 artifacts)
✅ **Frontmatter valid** for all files
✅ **Token count range**: 150-200 tokens per file
✅ **Language coverage**: Indonesian (formal + colloquial), English, Jakarta slang
✅ **Typo variations**: Included common misspellings and abbreviations
✅ **Compliance**: 100% compliant with workflow_infrastructure specification

---

## Version History

- **v1.0** (2025-10-10): Initial knowledge base creation (Task 3.1 completion)

---

## Questions?

- **For implementation**: See Task 3.1 completion report in `__references__/workflow/documentation/workflow_infrastructure/workflow_task/phase_03/report/`
- **For semantic detection details**: Read `semantic_detection.md` in `04_proposed_improvements/`
- **For workflow system overview**: Start with `workflow_infrastructure/CLAUDE.md`

---

**END OF README**
