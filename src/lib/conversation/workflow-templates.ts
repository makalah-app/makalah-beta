/**
 * ACADEMIC WORKFLOW CONVERSATION TEMPLATES - PHASE 2 IMPLEMENTATION
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Conversation templates for academic workflow phases
 * - Academic workflow conversation templates
 * - Phase-specific conversation initialization
 * - 100% AI SDK v5 compliance using ONLY /Users/eriksupit/Desktop/makalah/documentation as primary source
 * 
 * TEMPLATE FEATURES:
 * - Pre-configured academic workflows
 * - Phase-specific conversation starters
 * - Academic discipline customization
 * - Quality assurance templates
 */

import { UIMessage, generateId } from 'ai';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'academic' | 'research' | 'professional';
  phases: WorkflowPhase[];
  estimatedDuration: number; // in hours
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  targetAudience: string[];
  prerequisites: string[];
  expectedOutcomes: string[];
  metadata: WorkflowTemplateMetadata;
}

export interface WorkflowPhase {
  id: number;
  name: string;
  description: string;
  objectives: string[];
  deliverables: string[];
  estimatedTime: number; // in minutes
  requiredInputs: string[];
  qualityCriteria: string[];
  nextPhaseConditions: string[];
  conversationStarters: ConversationStarter[];
  tools: string[];
  resources: string[];
}

export interface ConversationStarter {
  trigger: 'phase_start' | 'user_stuck' | 'quality_check' | 'transition_prompt';
  message: string;
  context: any;
  expectedUserResponse: string[];
  followUpQuestions: string[];
}

export interface WorkflowTemplateMetadata {
  version: string;
  createdAt: number;
  updatedAt: number;
  usage: {
    totalUsage: number;
    successRate: number;
    averageCompletionTime: number;
  };
  tags: string[];
  discipline: string;
  academicLevel: string;
}

/**
 * ACADEMIC WRITING WORKFLOW TEMPLATE
 */
export const ACADEMIC_WRITING_TEMPLATE: WorkflowTemplate = {
  id: 'academic_writing',
  name: 'Academic Paper Writing',
  description: 'Comprehensive 7-phase academic paper development workflow',
  category: 'academic',
  phases: [
    {
      id: 1,
      name: 'Topic Definition & Research Planning',
      description: 'Define research topic, scope, and develop research questions',
      objectives: [
        'Define clear research topic and scope',
        'Develop specific research questions',
        'Plan research methodology approach',
        'Establish academic significance'
      ],
      deliverables: [
        'Refined topic title',
        'Research scope definition',
        'List of research questions',
        'Methodology approach outline'
      ],
      estimatedTime: 45,
      requiredInputs: [
        'General interest area or assignment requirements',
        'Academic discipline or field',
        'Target length and academic level'
      ],
      qualityCriteria: [
        'Topic is specific and researchable',
        'Research questions are clear and focused',
        'Scope is appropriate for paper length',
        'Academic significance is established'
      ],
      nextPhaseConditions: [
        'Topic is clearly defined and approved',
        'Research questions are specific and measurable',
        'Methodology approach is outlined'
      ],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: 'Mari kita mulai dengan mendefinisikan topik penelitian lo! Apa area atau subjek yang ingin lo bahas dalam paper akademik ini?',
          context: { phase: 1, step: 'topic_definition' },
          expectedUserResponse: ['topic area', 'research interest', 'assignment requirement'],
          followUpQuestions: [
            'Apa yang membuat topik ini menarik untuk lo?',
            'Apakah ada aspek khusus yang ingin lo fokuskan?',
            'Siapa target audience paper ini?'
          ]
        },
        {
          trigger: 'user_stuck',
          message: 'Sepertinya lo butuh bantuan untuk memperjelas topik. Mari coba beberapa alternatif pendekatan untuk mempersempit fokus penelitian:',
          context: { phase: 1, step: 'topic_refinement' },
          expectedUserResponse: ['clarification', 'alternative approach', 'more specific direction'],
          followUpQuestions: [
            'Mana dari pendekatan ini yang paling sesuai dengan minat lo?',
            'Apakah ada batasan atau persyaratan khusus yang harus dipenuhi?'
          ]
        }
      ],
      tools: ['topic_generator', 'research_planner'],
      resources: ['academic_databases', 'topic_examples']
    },
    {
      id: 2,
      name: 'Literature Review & Data Collection',
      description: 'Search and analyze relevant academic sources and collect data',
      objectives: [
        'Identify relevant academic sources',
        'Analyze current research in the field',
        'Identify research gaps',
        'Collect supporting data and evidence'
      ],
      deliverables: [
        'Comprehensive source bibliography',
        'Literature analysis and themes',
        'Research gap identification',
        'Data collection summary'
      ],
      estimatedTime: 90,
      requiredInputs: [
        'Defined research topic and questions',
        'Access to academic databases',
        'Search keywords and terms'
      ],
      qualityCriteria: [
        'Sources are current and relevant',
        'Literature spans multiple perspectives',
        'Research gaps are clearly identified',
        'Data supports research questions'
      ],
      nextPhaseConditions: [
        'Sufficient academic sources collected',
        'Literature themes identified',
        'Research gaps documented'
      ],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: '🔍 Sekarang kita masuk fase Literature Review! Mari mulai dengan mencari sumber akademik yang relevan untuk topik lo. Saya akan menggunakan web search untuk mencari literatur terbaru.',
          context: { phase: 2, step: 'source_search' },
          expectedUserResponse: ['ready to search', 'specific requirements', 'search preferences'],
          followUpQuestions: [
            'Apakah ada jenis sumber tertentu yang lo butuhkan (jurnal, buku, laporan penelitian)?',
            'Rentang tahun berapa yang lo anggap relevan untuk penelitian ini?'
          ]
        },
        {
          trigger: 'quality_check',
          message: 'Mari kita evaluasi kualitas sumber yang sudah kita kumpulkan. Berikut analisis sumber berdasarkan kriteria akademik:',
          context: { phase: 2, step: 'source_evaluation' },
          expectedUserResponse: ['source assessment', 'additional needs', 'quality concerns'],
          followUpQuestions: [
            'Apakah ada tema atau perspektif yang masih kurang dalam koleksi sumber ini?',
            'Sumber mana yang paling mendukung argumen utama lo?'
          ]
        }
      ],
      tools: ['web_search_preview', 'source_analyzer'],
      resources: ['academic_databases', 'citation_tools']
    },
    {
      id: 3,
      name: 'Outline Creation & Structure Planning',
      description: 'Develop detailed paper structure and logical flow',
      objectives: [
        'Create comprehensive paper outline',
        'Establish logical argument flow',
        'Plan section distribution',
        'Define key points for each section'
      ],
      deliverables: [
        'Detailed paper outline',
        'Section length estimates',
        'Logical flow diagram',
        'Key argument mapping'
      ],
      estimatedTime: 60,
      requiredInputs: [
        'Research questions and objectives',
        'Literature review findings',
        'Target paper length'
      ],
      qualityCriteria: [
        'Structure follows academic conventions',
        'Logical flow between sections',
        'Balanced section distribution',
        'Clear argument progression'
      ],
      nextPhaseConditions: [
        'Complete outline with all sections',
        'Logical flow established',
        'Key arguments mapped'
      ],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: '📝 Waktunya membuat struktur paper yang solid! Berdasarkan research questions dan literatur yang sudah kita kumpulkan, mari buat outline yang komprehensif.',
          context: { phase: 3, step: 'structure_planning' },
          expectedUserResponse: ['structure preference', 'section priorities', 'length requirements'],
          followUpQuestions: [
            'Apakah ada format struktur khusus yang diminta (IMRaD, traditional, dll)?',
            'Bagian mana yang lo rasa paling menantang untuk ditulis?'
          ]
        },
        {
          trigger: 'transition_prompt',
          message: 'Outline sudah terlihat solid! Mari kita review struktur ini sekali lagi sebelum mulai menulis. Apakah ada bagian yang perlu disesuaikan?',
          context: { phase: 3, step: 'outline_review' },
          expectedUserResponse: ['outline approval', 'adjustments needed', 'concerns'],
          followUpQuestions: [
            'Apakah urutan argumen sudah logis?',
            'Estimasi panjang tiap bagian sudah sesuai target?'
          ]
        }
      ],
      tools: ['outline_generator', 'structure_validator'],
      resources: ['structure_examples', 'academic_templates']
    },
    {
      id: 4,
      name: 'Draft Writing & Content Development',
      description: 'Write substantial paper content with academic rigor',
      objectives: [
        'Develop introduction and thesis',
        'Write main body paragraphs',
        'Create strong conclusions',
        'Maintain academic writing style'
      ],
      deliverables: [
        'Complete paper sections',
        'Draft word count achieved',
        'Academic writing style maintained',
        'Argument development completed'
      ],
      estimatedTime: 120,
      requiredInputs: [
        'Approved paper outline',
        'Research sources and data',
        'Academic writing guidelines'
      ],
      qualityCriteria: [
        'Clear thesis statement',
        'Well-developed arguments',
        'Academic writing style',
        'Proper paragraph structure'
      ],
      nextPhaseConditions: [
        'All major sections drafted',
        'Target word count achieved',
        'Arguments fully developed'
      ],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: '✍️ Saatnya mulai menulis! Berdasarkan outline yang sudah kita buat, mari mulai mengembangkan konten paper dengan struktur akademik yang solid.',
          context: { phase: 4, step: 'content_writing' },
          expectedUserResponse: ['writing preferences', 'section priorities', 'style questions'],
          followUpQuestions: [
            'Bagian mana yang ingin lo mulai dulu?',
            'Apakah ada gaya penulisan khusus yang diminta?'
          ]
        },
        {
          trigger: 'quality_check',
          message: 'Mari review progress writing lo sejauh ini. Berikut analisis konten dan saran perbaikan:',
          context: { phase: 4, step: 'writing_review' },
          expectedUserResponse: ['writing assessment', 'improvement areas', 'continuation plan'],
          followUpQuestions: [
            'Bagian mana yang lo rasa masih perlu diperkuat?',
            'Apakah alur argumen sudah cukup jelas?'
          ]
        }
      ],
      tools: ['content_generator', 'style_checker'],
      resources: ['writing_guides', 'academic_examples']
    },
    {
      id: 5,
      name: 'Citation Integration & Reference Management',
      description: 'Integrate proper citations and format references',
      objectives: [
        'Add in-text citations',
        'Format reference list',
        'Ensure citation consistency',
        'Verify source accuracy'
      ],
      deliverables: [
        'Properly cited paper',
        'Formatted bibliography',
        'Citation style compliance',
        'Source verification completed'
      ],
      estimatedTime: 45,
      requiredInputs: [
        'Complete paper draft',
        'Source bibliography',
        'Citation style requirements'
      ],
      qualityCriteria: [
        'All sources properly cited',
        'Citation style consistency',
        'Complete reference list',
        'No citation errors'
      ],
      nextPhaseConditions: [
        'All citations properly formatted',
        'Reference list complete',
        'Style guidelines followed'
      ],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: '📚 Waktunya mengintegrasikan citasi dan referensi! Mari pastikan semua sumber akademik lo tercantum dengan format yang benar.',
          context: { phase: 5, step: 'citation_integration' },
          expectedUserResponse: ['citation style', 'formatting preferences', 'reference questions'],
          followUpQuestions: [
            'Format citasi apa yang diminta (APA, MLA, Chicago, dll)?',
            'Apakah ada sumber yang masih perlu ditambahkan?'
          ]
        }
      ],
      tools: ['citation_formatter', 'reference_checker'],
      resources: ['citation_guides', 'style_manuals']
    },
    {
      id: 6,
      name: 'Review & Quality Assurance',
      description: 'Comprehensive review and quality improvement',
      objectives: [
        'Review content quality',
        'Check argument coherence',
        'Verify citation accuracy',
        'Assess overall structure'
      ],
      deliverables: [
        'Quality assessment report',
        'Improvement recommendations',
        'Revised paper version',
        'Final quality approval'
      ],
      estimatedTime: 75,
      requiredInputs: [
        'Complete paper with citations',
        'Quality criteria checklist',
        'Academic standards guidelines'
      ],
      qualityCriteria: [
        'Content meets academic standards',
        'Arguments are coherent',
        'Citations are accurate',
        'Structure is logical'
      ],
      nextPhaseConditions: [
        'Quality issues addressed',
        'Paper meets academic standards',
        'Final approval obtained'
      ],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: '🔍 Mari lakukan review menyeluruh untuk memastikan paper lo memenuhi standar akademik tertinggi! Saya akan mengecek berbagai aspek kualitas.',
          context: { phase: 6, step: 'comprehensive_review' },
          expectedUserResponse: ['review priorities', 'specific concerns', 'quality standards'],
          followUpQuestions: [
            'Aspek mana yang lo paling khawatirkan?',
            'Apakah ada feedback khusus dari supervisor/dosen?'
          ]
        }
      ],
      tools: ['quality_analyzer', 'coherence_checker'],
      resources: ['quality_rubrics', 'review_checklists']
    },
    {
      id: 7,
      name: 'Final Formatting & Submission Preparation',
      description: 'Format paper for submission and prepare final version',
      objectives: [
        'Apply final formatting',
        'Create submission package',
        'Verify all requirements',
        'Prepare supplementary materials'
      ],
      deliverables: [
        'Publication-ready paper',
        'Formatted submission version',
        'Supplementary materials',
        'Submission checklist completed'
      ],
      estimatedTime: 30,
      requiredInputs: [
        'Reviewed and approved paper',
        'Submission guidelines',
        'Formatting requirements'
      ],
      qualityCriteria: [
        'Formatting meets requirements',
        'All elements properly styled',
        'Submission package complete',
        'Final checklist verified'
      ],
      nextPhaseConditions: [
        'Paper ready for submission',
        'All requirements met',
        'Final approval obtained'
      ],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: '🎯 Tahap final! Mari format paper lo untuk submission dan pastikan semua persyaratan terpenuhi.',
          context: { phase: 7, step: 'final_formatting' },
          expectedUserResponse: ['format requirements', 'submission details', 'final questions'],
          followUpQuestions: [
            'Apakah ada format khusus yang diminta untuk submission?',
            'Dokumen tambahan apa saja yang perlu disiapkan?'
          ]
        },
        {
          trigger: 'transition_prompt',
          message: '🎉 Selamat! Paper akademik lo sudah siap untuk disubmit! Mari review final checklist untuk memastikan semuanya perfect.',
          context: { phase: 7, step: 'completion' },
          expectedUserResponse: ['final confirmation', 'submission plan', 'celebration'],
          followUpQuestions: [
            'Apakah lo sudah puas dengan hasil akhirnya?',
            'Ada yang ingin ditambahkan sebelum submission?'
          ]
        }
      ],
      tools: ['formatter', 'submission_packager'],
      resources: ['format_templates', 'submission_guides']
    }
  ],
  estimatedDuration: 8.5, // total hours
  difficultyLevel: 'intermediate',
  targetAudience: ['undergraduate_students', 'graduate_students', 'researchers'],
  prerequisites: ['basic_research_skills', 'academic_writing_fundamentals'],
  expectedOutcomes: ['complete_academic_paper', 'improved_research_skills', 'academic_writing_proficiency'],
  metadata: {
    version: '2.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usage: {
      totalUsage: 0,
      successRate: 0,
      averageCompletionTime: 0
    },
    tags: ['academic_writing', 'research_paper', '7_phases', 'comprehensive'],
    discipline: 'general',
    academicLevel: 'undergraduate_graduate'
  }
};

/**
 * LITERATURE REVIEW WORKFLOW TEMPLATE
 */
export const LITERATURE_REVIEW_TEMPLATE: WorkflowTemplate = {
  id: 'literature_review',
  name: 'Literature Review',
  description: 'Focused literature review and synthesis workflow',
  category: 'research',
  phases: [
    {
      id: 1,
      name: 'Research Question & Scope Definition',
      description: 'Define review objectives and scope boundaries',
      objectives: ['Define review questions', 'Establish scope boundaries', 'Set inclusion/exclusion criteria'],
      deliverables: ['Review questions', 'Scope definition', 'Search strategy'],
      estimatedTime: 30,
      requiredInputs: ['Research topic', 'Review purpose'],
      qualityCriteria: ['Questions are focused', 'Scope is manageable'],
      nextPhaseConditions: ['Questions defined', 'Scope established'],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: 'Mari definisikan fokus literature review lo! Apa pertanyaan penelitian utama yang ingin dijawab melalui review ini?',
          context: { phase: 1, step: 'question_definition' },
          expectedUserResponse: ['research question', 'review purpose', 'scope preference'],
          followUpQuestions: ['Seberapa luas scope yang lo inginkan?', 'Apakah ada batasan tahun publikasi?']
        }
      ],
      tools: ['question_refiner'],
      resources: ['review_examples']
    },
    {
      id: 2,
      name: 'Literature Search & Collection',
      description: 'Systematic search and collection of relevant sources',
      objectives: ['Conduct systematic search', 'Apply inclusion criteria', 'Organize collected sources'],
      deliverables: ['Source database', 'Search log', 'Selection rationale'],
      estimatedTime: 60,
      requiredInputs: ['Search strategy', 'Database access'],
      qualityCriteria: ['Comprehensive search', 'Relevant sources'],
      nextPhaseConditions: ['Sufficient sources collected', 'Selection documented'],
      conversationStarters: [
        {
          trigger: 'phase_start',
          message: '🔍 Mulai pencarian literatur sistematis! Mari gunakan web search untuk mengumpulkan sumber akademik yang relevan.',
          context: { phase: 2, step: 'systematic_search' },
          expectedUserResponse: ['search preferences', 'database choices'],
          followUpQuestions: ['Database mana yang ingin lo prioritaskan?']
        }
      ],
      tools: ['web_search_preview', 'source_organizer'],
      resources: ['academic_databases']
    }
  ],
  estimatedDuration: 6,
  difficultyLevel: 'intermediate',
  targetAudience: ['researchers', 'graduate_students'],
  prerequisites: ['research_methodology'],
  expectedOutcomes: ['comprehensive_literature_review'],
  metadata: {
    version: '2.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usage: { totalUsage: 0, successRate: 0, averageCompletionTime: 0 },
    tags: ['literature_review', 'systematic_review'],
    discipline: 'general',
    academicLevel: 'graduate'
  }
};

/**
 * WORKFLOW TEMPLATE REGISTRY
 */
export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  academic_writing: ACADEMIC_WRITING_TEMPLATE,
  literature_review: LITERATURE_REVIEW_TEMPLATE,
};

/**
 * TEMPLATE MANAGEMENT FUNCTIONS
 */

/**
 * Get all available workflow templates
 */
export function getAllWorkflowTemplates(): WorkflowTemplate[] {
  return Object.values(WORKFLOW_TEMPLATES);
}

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplate(templateId: string): WorkflowTemplate | null {
  return WORKFLOW_TEMPLATES[templateId] || null;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return Object.values(WORKFLOW_TEMPLATES).filter(template => template.category === category);
}

/**
 * Get conversation starter for specific phase and trigger
 */
export function getConversationStarter(
  templateId: string,
  phase: number,
  trigger: ConversationStarter['trigger']
): ConversationStarter | null {
  const template = getWorkflowTemplate(templateId);
  if (!template) return null;
  
  const phaseData = template.phases.find(p => p.id === phase);
  if (!phaseData) return null;
  
  return phaseData.conversationStarters.find(starter => starter.trigger === trigger) || null;
}

/**
 * Create initial message for conversation based on template and phase
 */
export function createInitialMessage(
  templateId: string,
  phase: number,
  userId: string,
  conversationId: string
): UIMessage | null {
  const starter = getConversationStarter(templateId, phase, 'phase_start');
  if (!starter) return null;
  
  return {
    id: generateId(),
    role: 'assistant',
    content: starter.message,
    parts: [
      {
        type: 'text',
        text: starter.message
      }
    ],
    createdAt: new Date(),
    metadata: {
      userId,
      conversationId,
      phase,
      templateId,
      trigger: 'phase_start',
      context: starter.context,
      isTemplateMessage: true
    }
  };
}

/**
 * Validate workflow template structure
 */
export function validateWorkflowTemplate(template: WorkflowTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic structure validation
  if (!template.id || !template.name) {
    errors.push('Template must have id and name');
  }
  
  if (!template.phases || template.phases.length === 0) {
    errors.push('Template must have at least one phase');
  }
  
  // Phase validation
  if (template.phases) {
    template.phases.forEach((phase, index) => {
      if (phase.id !== index + 1) {
        errors.push(`Phase ${index} should have id ${index + 1}`);
      }
      
      if (!phase.conversationStarters || phase.conversationStarters.length === 0) {
        errors.push(`Phase ${phase.id} must have conversation starters`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get workflow progress based on current phase
 */
export function calculateWorkflowProgress(
  templateId: string,
  currentPhase: number,
  completedPhases: number[] = []
): {
  percentage: number;
  currentPhaseName: string;
  totalPhases: number;
  estimatedTimeRemaining: number;
} {
  const template = getWorkflowTemplate(templateId);
  if (!template) {
    return {
      percentage: 0,
      currentPhaseName: 'Unknown',
      totalPhases: 0,
      estimatedTimeRemaining: 0
    };
  }
  
  const totalPhases = template.phases.length;
  const currentPhaseData = template.phases.find(p => p.id === currentPhase);
  
  // Calculate progress based on completed phases
  const completedCount = completedPhases.length;
  const percentage = Math.min(Math.round((completedCount / totalPhases) * 100), 100);
  
  // Calculate estimated time remaining
  const remainingPhases = template.phases.filter(p => !completedPhases.includes(p.id) && p.id >= currentPhase);
  const estimatedTimeRemaining = remainingPhases.reduce((total, phase) => total + phase.estimatedTime, 0);
  
  return {
    percentage,
    currentPhaseName: currentPhaseData?.name || 'Unknown Phase',
    totalPhases,
    estimatedTimeRemaining
  };
}