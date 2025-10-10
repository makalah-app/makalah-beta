---
from_phase: exploring
to_phase: topic_locked
chunk_type: transition
---

# Transition: Exploring → Topic Locked

## Trigger Conditions
- User explicitly agrees on a specific topic after exploration
- User confirms research question is clear and researchable
- User shows commitment to proceed with chosen topic
- User locks in on a specific direction after considering multiple options

## Natural Language Signals
- "Setuju, kita pakai topik ini"
- "Oke, locked"
- "Ya, fokus ke [topic]"
- "Topik sudah fix"
- "Mari lanjut dengan [topic]"
- "I agree on this topic"
- "Let's go with this one"
- "Topic is confirmed"
- "Oke, ini yang mau gue tulis"
- "Ya, topik ini bagus"

## Guardrails
- Cannot skip from exploring directly to researching (must lock topic first)
- Cannot go backward (topic_locked → exploring not allowed without explicit user request)
- Must have clear topic statement before transition
- Research question must be specific and answerable

## Common User Expressions
- Approval: "Oke", "Setuju", "Cocok", "Ya", "Bagus", "Sip", "Approved"
- Commitment: "Mari", "Lanjut", "Mulai", "Kita pakai", "Ayo"
- Lock indicators: "Fix", "Locked", "Sudah dipilih", "Confirmed"
- Code-switching: "Let's lock this in", "Agreed", "Go ahead"
- Jakarta slang: "Gas", "Oke sip", "Gue setuju"
