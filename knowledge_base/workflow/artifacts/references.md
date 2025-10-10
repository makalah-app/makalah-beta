---
artifact_type: references
required_phases: [researching, foundation_ready, outlining, outline_locked, drafting, drafting_locked, integrating, polishing, delivered]
chunk_type: artifact
---

# References Artifact

## Description
Academic references extracted from LLM responses during researching and foundation_ready phases. This artifact accumulates peer-reviewed papers, journals, conference proceedings, and authoritative sources throughout the workflow. It serves as the evidence base for all claims.

## Format Expected
- **Author-year format**: "Smith (2023). 'Title of Paper'. Journal Name."
- **Multiple authors**: "Smith & Jones (2024). 'Study on X'. Conference Proceedings."
- **Institutional**: "WHO (2023). 'Guidelines on Y'. Official Report."
- **Web sources** (if credible): "Organization (2024). 'Report Title'. URL"

## Extraction Patterns
Model typically mentions references as:
- "Menurut Smith (2023), ..."
- "According to Jones et al. (2024), ..."
- "Studi oleh Wang et al. (2024) menemukan..."
- "Berdasarkan WHO (2023), ..."
- "Research by Brown & Lee (2023) shows..."
- "A study published in Nature (2024) found..."

## Quality Indicators
- **Minimum**: 5-8 peer-reviewed sources for foundation_ready transition
- **Preferred**: Journal articles, conference proceedings, official reports, government agencies
- **Recency**: Majority of sources from last 5 years (unless historical context needed)
- **Avoid**: Blog posts, Wikipedia, non-authoritative sources, personal websites

## Natural Language Context
- "Berikut beberapa referensi yang relevan untuk topikmu..."
- "Aku sudah cari paper tentang AI bias, ada 6 jurnal peer-reviewed..."
- "Ada studi dari UC San Francisco yang dipublikasi di JAMA Network Open 2024..."
- "Menurut penelitian Smith (2023) yang dipublikasi di Nature Medicine..."
- "WHO (2023) melaporkan bahwa..."
