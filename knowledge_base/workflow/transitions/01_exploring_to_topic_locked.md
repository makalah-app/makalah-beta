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

### User Signals (Topic Commitment)
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
- "Saya ingin menulis paper tentang [topic]"
- "Topik saya: [detailed topic description]"
- "Oke saya pilih topik [topic]"
- "Yo bikin paper: [topic]"
- "Mau bikin paper tentang [topic]"
- "Gue mau nulis paper [topic]"
- "Ayo bikin paper [topic]"
- "Bikin makalah tentang [topic]"
- "Paper gue tentang [topic]"
- "Tugas paper: [topic]"

### AI Signals (Acknowledging Lock)
- "kita bisa mengunci topik ini"
- "topik sudah locked"
- "mari kita tentukan pertanyaan penelitian"
- "langkah berikutnya adalah mendefinisikan pertanyaan penelitian"
- "dengan topik yang sudah jelas, kita bisa mulai [next phase]"
- "topik yang sangat menarik! mari kita lock"
- "oke, topik sudah dipilih. sekarang kita rumuskan research questions"
- "bagus! apakah kita locked dengan topik ini?"
- "perfect! dengan topik [topic], kita bisa mulai researching"

### Bi-directional Signals (User or AI)
- "research question"
- "pertanyaan penelitian"
- "rumusan masalah"
- "research scope"
- "fokus penelitian"
- "batasan topik"

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
