---
from_phase: outlining
to_phase: outline_locked
chunk_type: transition
---

# Transition: Outlining → Outline Locked

## Trigger Conditions
- User explicitly approves the proposed outline structure
- User confirms all sections and subsections are correct
- User agrees to lock the structure and begin writing
- Model confirms outline is finalized

## Natural Language Signals
- "Outline sudah oke"
- "Setuju dengan struktur ini"
- "Locked, mari mulai nulis"
- "Structure approved"
- "Let's start writing"
- "Oke, lanjut ke drafting"
- "Outline confirmed"
- "Siap mulai nulis"
- "Structure is final"
- "Cocok, kita pakai ini"

## Guardrails
- Cannot lock outline without user approval
- Cannot skip to drafting without locking outline
- Cannot return to outlining after locking (without explicit request)
- Must have complete section structure (not partial)

## Common User Expressions
- Approval: "Oke", "Setuju", "Approved", "Ya bagus", "Cocok"
- Lock indicators: "Locked", "Fix", "Final", "Confirmed", "Done"
- Transition: "Lanjut nulis", "Start drafting", "Mari tulis", "Let's write"
- Code-switching: "Outline is locked", "Let's draft"
- Jakarta slang: "Udah fix", "Oke sip", "Lanjut aja"
