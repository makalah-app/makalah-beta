---
chunk_type: artifact
---

# Section Writing Guidelines

## Abstract

**Purpose**: Standalone summary of entire paper. Readers should understand research without reading full paper.

**Length**: 150-300 words (undergraduate: 150-250, master's/journal: 200-300)

**Structure** (in order):
1. **Background** (1-2 sentences): What is the problem/topic?
2. **Objective** (1 sentence): What did you study? Research questions?
3. **Methods** (1-2 sentences): How did you investigate? (design, data, analysis)
4. **Results** (2-3 sentences): What did you find? (key findings only)
5. **Conclusion** (1 sentence): What does it mean? Implications?

**Tense**: Past tense for methods/results. Present tense for background/conclusion.

**Writing Tips**:
- ✅ Self-contained (no references to figures, tables, citations)
- ✅ Concrete numbers (not "many participants" → "250 participants")
- ✅ Keywords included (for searchability)
- ❌ No abbreviations (except universally known: DNA, AI, etc.)
- ❌ No "this paper will..." (abstract describes completed work)

**Example** (APA style):
> AI bias in healthcare diagnostic systems poses risks to patient safety and equity. This study investigates gender and racial biases in three commercial AI diagnostic tools used for cardiovascular disease prediction. We analyzed 5,000 patient records from diverse demographics using algorithmic audit methods. Results show significant gender bias (8.3% accuracy gap favoring male patients) and moderate racial bias (5.1% gap favoring white patients). Findings suggest the need for bias mitigation strategies and regulatory frameworks. This research contributes to understanding algorithmic fairness in high-stakes medical contexts.

---

## Introduction

**Purpose**: Introduce topic, establish research gap, state research questions, preview paper structure.

**Length**: 10-15% of total paper (undergraduate: 1000-1500 words, master's: 2000-3000 words)

**Structure** (funnel approach - broad to specific):
1. **Opening** (1-2 paragraphs): Broad context and why topic matters
2. **Background** (2-3 paragraphs): Key concepts, current state of knowledge
3. **Research Gap** (1-2 paragraphs): What's missing? What's unclear? Why investigate?
4. **Research Questions/Objectives** (1 paragraph): What exactly are you studying?
5. **Significance** (1 paragraph): Why does this matter? (theoretical, practical, policy)
6. **Structure Overview** (1 paragraph): "This paper is organized as follows..."

**Tense**: Present tense for current state. Past tense for prior research.

**Writing Tips**:
- ✅ Start broad, narrow to specific problem
- ✅ Cite recent literature (last 5 years) to show gap
- ✅ Clear research questions (1-3 questions, specific, answerable)
- ✅ Establish significance (theoretical and practical value)
- ❌ Don't start with dictionary definition ("AI is...")
- ❌ Don't oversell importance ("This groundbreaking study...")
- ❌ Don't include results in introduction (save for Results section)

**Indonesian Standard** (BAB I: PENDAHULUAN):
- 1.1 Latar Belakang (Background)
- 1.2 Rumusan Masalah (Problem Statement/RQ)
- 1.3 Tujuan Penelitian (Objectives)
- 1.4 Manfaat Penelitian (Significance)
- 1.5 Batasan Masalah (Scope/Limitations)
- 1.6 Sistematika Penulisan (Structure Overview)

---

## Literature Review

**Purpose**: Survey prior research, identify gaps, establish theoretical framework.

**Length**: 25-30% of total paper (undergraduate: 2500-3000 words, master's: 5000-6000 words)

**Structure** (thematic, not chronological):
1. **Introduction to Lit Review** (1 paragraph): What will be covered?
2. **Theoretical Framework** (2-3 subsections): Key concepts, models, theories
3. **Thematic Reviews** (3-5 subsections): Organized by theme, not author
   - Example themes: "AI Bias Detection Methods", "Healthcare Applications", "Fairness Metrics"
4. **Research Gaps** (1-2 paragraphs): What's missing in current literature?
5. **Summary** (1 paragraph): Synthesis and transition to methods

**Tense**: Past tense for describing prior studies. Present tense for generalizations.

**Writing Tips**:
- ✅ Organize by themes/concepts, not authors ("Studies show X..." not "Smith found... Jones found...")
- ✅ Critical analysis (strengths, weaknesses, contradictions)
- ✅ Compare and contrast studies (synthesize, don't just summarize)
- ✅ Link to your research questions (show how literature informs your study)
- ❌ Don't just list summaries ("Smith studied X. Jones studied Y.")
- ❌ Don't uncritically accept all prior research (evaluate quality)
- ❌ Don't cite every single paper ever written (focus on most relevant)

**Synthesizing Example**:
> **Bad** (listing): "Smith (2021) found AI bias in healthcare. Jones (2022) also found bias. Lee (2023) studied fairness."
>
> **Good** (synthesis): "Recent studies consistently demonstrate AI bias in healthcare diagnostics (Smith, 2021; Jones, 2022; Lee, 2023), though methodological approaches vary from algorithmic audits (Smith, 2021) to patient outcome analysis (Jones, 2022). Lee (2023) extends this work by proposing fairness metrics, yet practical implementation remains underexplored."

---

## Methods

**Purpose**: Describe how research was conducted with enough detail for replication.

**Length**: 10-15% of total paper (undergraduate: 1000-1500 words, master's: 2000-3000 words)

**Structure** (subsections):
1. **Research Design** (1 paragraph): Overall approach (quantitative, qualitative, mixed)
2. **Participants/Sampling** (1-2 paragraphs): Who, how many, how selected
   - For experiments: demographics, inclusion/exclusion criteria
   - For datasets: source, size, representativeness
3. **Materials/Instruments** (1-2 paragraphs): Tools, surveys, datasets, equipment
4. **Procedures** (2-3 paragraphs): Step-by-step what you did
5. **Data Analysis** (1-2 paragraphs): Statistical methods, software, techniques
6. **Ethical Considerations** (1 paragraph): IRB approval, consent, privacy

**Tense**: Past tense (describing what you did).

**Writing Tips**:
- ✅ Enough detail for replication (another researcher should reproduce)
- ✅ Justify choices ("We selected method X because...")
- ✅ Specify software/tools (SPSS v28, Python 3.9, R 4.2)
- ✅ Include limitations of methods (acknowledge constraints)
- ❌ Don't include results here (only describe methods)
- ❌ Don't be vague ("We analyzed the data" → How? What techniques?)
- ❌ Don't skip ethical approval if required (IRB, consent)

**Quantitative Example**:
> We recruited 250 participants (125 male, 125 female, ages 25-65) through stratified random sampling from hospital records. Participants completed a 30-item survey (Likert scale, 1-5) assessing perceptions of AI diagnostic accuracy. Data were analyzed using SPSS v28. We conducted independent t-tests to compare gender differences (α = 0.05) and multiple regression to identify predictors of AI trust (R²).

**Qualitative Example**:
> We conducted 20 semi-structured interviews with healthcare providers (10 physicians, 10 nurses) at three urban hospitals. Interviews lasted 45-60 minutes, were audio-recorded, and transcribed verbatim. We used thematic analysis (Braun & Clarke, 2006) with NVivo 12 for coding. Two researchers independently coded transcripts, with inter-coder reliability κ = 0.82. Themes were identified through iterative coding and consensus discussions.

---

## Results

**Purpose**: Present findings objectively, without interpretation.

**Length**: 20-25% of total paper (undergraduate: 2000-2500 words, master's: 4000-5000 words)

**Structure**:
1. **Descriptive Statistics** (1-2 paragraphs): Sample characteristics, overview
2. **Main Findings** (organized by RQ):
   - **RQ1 Results** (2-3 paragraphs + table/figure)
   - **RQ2 Results** (2-3 paragraphs + table/figure)
   - **RQ3 Results** (2-3 paragraphs + table/figure)
3. **Additional Findings** (1-2 paragraphs): Unexpected results, post-hoc analysis

**Tense**: Past tense (describing what you found).

**Writing Tips**:
- ✅ Report all relevant findings (even negative/unexpected)
- ✅ Use tables/figures for complex data (don't duplicate in text)
- ✅ Include statistical details (p-values, effect sizes, confidence intervals)
- ✅ Organize by research questions (clear mapping)
- ❌ Don't interpret findings yet (save for Discussion)
- ❌ Don't cherry-pick only positive results (report all)
- ❌ Don't include raw data (use summary statistics + tables)

**Statistical Reporting** (APA):
- t-test: t(248) = 3.45, p = .001, d = 0.44
- ANOVA: F(2, 247) = 8.32, p < .001, η² = 0.06
- Regression: β = 0.28, t = 4.12, p < .001, R² = 0.34

**Table/Figure Guidelines**:
- Tables: Numerical data, comparisons
- Figures: Trends, relationships, distributions
- Captions: Descriptive (reader understands without reading text)
- Numbering: Sequential (Table 1, Table 2, Figure 1, Figure 2)

---

## Discussion

**Purpose**: Interpret findings, compare with prior research, acknowledge limitations, suggest implications.

**Length**: 20-25% of total paper (undergraduate: 2000-2500 words, master's: 4000-5000 words)

**Structure**:
1. **Summary of Findings** (1 paragraph): Brief restatement of main results
2. **Interpretation** (3-4 paragraphs): What do findings mean?
   - Theoretical implications
   - Practical implications
   - Policy implications
3. **Comparison with Prior Research** (2-3 paragraphs):
   - What aligns with previous studies?
   - What contradicts? Why?
4. **Limitations** (1-2 paragraphs): Acknowledge weaknesses (sample, methods, scope)
5. **Future Research** (1-2 paragraphs): Suggest next steps, unanswered questions
6. **Conclusion** (1 paragraph): Transition to final conclusion

**Tense**: Present tense for interpretations. Past tense for your specific findings.

**Writing Tips**:
- ✅ Interpret beyond data (connect to theory, explain mechanisms)
- ✅ Acknowledge alternative explanations (consider rival hypotheses)
- ✅ Be honest about limitations (builds credibility)
- ✅ Suggest actionable future research (specific questions, not vague "more research needed")
- ❌ Don't overstate findings ("This proves..." → "This suggests...")
- ❌ Don't introduce new data (use only Results section findings)
- ❌ Don't ignore contradictory results (address them)

**Limitation Examples**:
> "This study's cross-sectional design limits causal inference. Future longitudinal research could track AI bias impacts over time. Additionally, our sample was limited to urban hospitals; rural healthcare settings may show different patterns."

---

## Conclusion

**Purpose**: Summarize findings, restate significance, provide closure.

**Length**: 5-10% of total paper (undergraduate: 500-1000 words, master's: 1000-2000 words)

**Structure** (Indonesian 5-chapter):
1. **Kesimpulan** (Conclusion): 2-3 paragraphs summarizing main findings
2. **Saran** (Recommendations): 1-2 paragraphs suggesting actions, future research

**Structure** (International journal):
1. **Summary** (1 paragraph): Restate research purpose and main findings
2. **Contributions** (1 paragraph): Theoretical, methodological, practical contributions
3. **Implications** (1 paragraph): For practitioners, policymakers, researchers
4. **Final Remarks** (1 paragraph): Broader significance, closing thought

**Tense**: Present tense (generalizations). Past tense (specific findings).

**Writing Tips**:
- ✅ Mirror introduction structure (bookend effect)
- ✅ Emphasize significance and contributions
- ✅ End with impactful statement (not "more research needed")
- ❌ Don't introduce new information (only synthesize existing)
- ❌ Don't repeat results verbatim (synthesize and interpret)
- ❌ Don't end weakly ("This study has limitations..." → End with impact!)

**Strong Ending Examples**:
> "As AI systems increasingly influence healthcare decisions, ensuring algorithmic fairness is not optional—it is a moral imperative. This research demonstrates that bias is measurable, addressable, and preventable. The path forward requires collaboration among technologists, clinicians, and policymakers to build AI systems that serve all patients equitably."

---

## Common Section Mistakes

### ❌ Wrong Tense
- Abstract: "This paper **will investigate**..." → Use past tense
- Methods: "We **analyze** data..." → Use past tense ("analyzed")
- Results: "The findings **suggest**..." → Save interpretation for Discussion

### ❌ Wrong Content Location
- Introduction contains results → Move to Results section
- Methods contains interpretation → Move to Discussion
- Results contain citations to prior research → Move to Literature Review

### ❌ Inconsistent Voice
- Mixing "I" (first person), "we" (first plural), "the researcher" (third person)
- **Fix**: Choose one voice. Academic preference: Third person or "we" (for team research)

### ❌ Vague Language
- "Many studies show..." → How many? Cite specific studies
- "The results were significant..." → What p-value? Effect size?
- "Future research is needed..." → What specific research? What questions?

### ❌ Over/Under-Citing
- **Over-citing**: "AI is used in healthcare (Smith, 2020; Jones, 2021; Lee, 2022; Wang, 2023)." → Common knowledge doesn't need 4 citations
- **Under-citing**: "AI bias is a major problem." → Needs citation! Not common knowledge

---

## Final Validation Checklist

- ✅ Each section has appropriate structure and length
- ✅ Tenses used correctly (past for methods/results, present for interpretation)
- ✅ Content in correct sections (no results in intro, no new data in discussion)
- ✅ All research questions addressed in Results
- ✅ Limitations acknowledged honestly in Discussion
- ✅ Conclusion mirrors Introduction (bookend effect)
- ✅ Writing is clear, concise, academic tone (no colloquialisms)
- ✅ Citations support all claims (no unsupported assertions)
- ✅ Tables/figures properly formatted and referenced in text
