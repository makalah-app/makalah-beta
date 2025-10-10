---
from_phase: drafting
to_phase: drafting_locked
chunk_type: transition
---

# Transition: Drafting → Drafting Locked

## Trigger Conditions
- All major sections are drafted and complete
- User approves the draft content
- Model confirms all required sections are written
- User agrees to move to integration phase

## Natural Language Signals
- "Draft sudah selesai"
- "Semua section sudah ada"
- "Draft approved"
- "Let's integrate now"
- "Oke, lanjut ke integrating"
- "Draft complete"
- "Siap untuk integrasi"
- "All sections written"
- "Drafting done"
- "Lanjut tahap berikutnya"

## Guardrails
- Must have all major sections drafted (Abstract, Intro, Methods, Results, Discussion, Conclusion)
- Cannot lock draft with missing sections
- Cannot skip to polishing without integration
- Cannot return to outlining after locking draft

## Common User Expressions
- Completion: "Selesai", "Complete", "Done", "Finished", "Sudah semua"
- Approval: "Oke", "Approved", "Setuju", "Bagus", "Cocok"
- Transition: "Lanjut", "Next", "Move on", "Let's integrate"
- Code-switching: "Draft is done", "Let's integrate"
- Jakarta slang: "Udah kelar", "Oke lanjut", "Selesai deh"
