---
phase: researching
index: 2
progress: 0.25
chunk_type: phase_definition
---

# Researching Phase

## Description
Active literature search and reference gathering phase. Model conducts web searches to find peer-reviewed papers, journals, conference proceedings, and authoritative sources. Focus is on quantity and quality of references.

## Natural Language Indicators
- "Mari mulai researching"
- "Kita cari literatur dulu"
- "Tolong carikan referensi"
- "Ada paper tentang [topic]?"
- "Cari jurnal yang relevan"
- "Let's search for sources"
- "I need references on..."
- "Find me studies about..."
- "Mana referensinya?"
- "Browse dong literaturnya"
- "Search paper tentang..."

## Model Behavior
- Execute multiple web_search tool calls with academic keywords
- Prioritize peer-reviewed journals, conference papers, official reports
- Extract and format references in author-year format
- Provide brief summaries of key findings from each source
- Search with variations: different keyword combinations, synonyms, related terms
- Accumulate 5-8+ credible sources before declaring foundation ready

## Exit Criteria
Sufficient high-quality references gathered (≥5-8 peer-reviewed sources) → Transition to `foundation_ready`

## Common Variations
- Riset, penelitian, cari literatur, cari referensi, cari jurnal, cari paper
- "Tolong search", "Cariin dong", "Ada gak...", "Mana buktinya?"
- Code-switching: "Let's do research", "Search for papers"
- Typos: "penelitean", "refrensi", "literatur"
- Jakarta slang: "Cariin literatur dong", "Lu search ya", "Gue butuh referensi nih"
