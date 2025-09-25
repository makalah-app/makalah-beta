-- Migration: Task 7.7 - Admin Configuration Sample Data
-- Description: Sample data untuk testing admin configuration tables
-- Author: Database Architect
-- Date: 2025-01-26
-- Task: 7.7 - Admin Configuration Sample Data

-- NOTE: This creates sample admin settings and model configurations
-- User creation skipped due to trigger conflicts, will be resolved in AUTH block

-- ====================================================================
-- ADMIN SETTINGS SAMPLE DATA
-- ====================================================================

-- Insert default admin settings (using system user ID temporarily)
INSERT INTO public.admin_settings (
    setting_key,
    setting_value,
    setting_type,
    category,
    description,
    metadata,
    validation_rules,
    is_sensitive,
    is_system,
    updated_by
) VALUES
    -- System Configuration
    ('system_name', 'Makalah AI Platform', 'string', 'system', 'Application name displayed to users', '{"display_order": 1}', '{"min_length": 3}', false, true, '00000000-0000-0000-0000-000000000001'),
    ('system_version', '1.0.0', 'string', 'system', 'Current system version', '{"display_order": 2}', '{"pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$"}', false, true, '00000000-0000-0000-0000-000000000001'),
    ('maintenance_mode', 'false', 'boolean', 'system', 'Enable maintenance mode', '{"display_order": 3}', '{}', false, false, '00000000-0000-0000-0000-000000000001'),
    
    -- AI Configuration
    ('default_ai_provider', 'openai', 'string', 'ai_config', 'Default AI provider untuk new workflows', '{"display_order": 10}', '{"enum": ["openai", "openrouter", "anthropic", "google"]}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('max_tokens_default', '4096', 'integer', 'ai_config', 'Default max tokens untuk AI responses', '{"display_order": 11}', '{"min": 1, "max": 32768}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('temperature_default', '0.7', 'decimal', 'ai_config', 'Default temperature untuk AI responses', '{"display_order": 12}', '{"min": 0.0, "max": 2.0}', false, false, '00000000-0000-0000-0000-000000000001'),
    
    -- Content Limits
    ('max_workflow_per_user', '10', 'integer', 'limits', 'Maximum workflows per user', '{"display_order": 20}', '{"min": 1, "max": 100}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('max_artifact_size_mb', '50', 'integer', 'limits', 'Maximum artifact file size dalam MB', '{"display_order": 21}', '{"min": 1, "max": 1000}', false, false, '00000000-0000-0000-0000-000000000001'),
    
    -- Security Settings
    ('session_timeout_hours', '24', 'integer', 'security', 'Session timeout dalam hours', '{"display_order": 30}', '{"min": 1, "max": 168}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('password_min_length', '8', 'integer', 'security', 'Minimum password length', '{"display_order": 31}', '{"min": 6, "max": 128}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('enable_two_factor', 'false', 'boolean', 'security', 'Enable two-factor authentication', '{"display_order": 32}', '{}', false, false, '00000000-0000-0000-0000-000000000001'),
    
    -- API Configuration (sensitive)
    ('openai_api_key', 'sk-placeholder-key-will-be-replaced', 'string', 'api_keys', 'OpenAI API Key', '{"display_order": 40}', '{"pattern": "^sk-[A-Za-z0-9]+$"}', true, false, '00000000-0000-0000-0000-000000000001'),
    ('openrouter_api_key', 'sk-or-placeholder-key', 'string', 'api_keys', 'OpenRouter API Key', '{"display_order": 41}', '{"pattern": "^sk-or-[A-Za-z0-9]+$"}', true, false, '00000000-0000-0000-0000-000000000001'),
    
    -- Email Configuration
    ('smtp_server', 'smtp.gmail.com', 'url', 'email', 'SMTP server untuk outbound emails', '{"display_order": 50}', '{}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('support_email', 'support@makalah.ai', 'email', 'email', 'Support email address', '{"display_order": 51}', '{}', false, false, '00000000-0000-0000-0000-000000000001'),
    
    -- Feature Flags
    ('enable_web_search', 'true', 'boolean', 'features', 'Enable web search functionality', '{"display_order": 60}', '{}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('enable_citation_auto_format', 'true', 'boolean', 'features', 'Enable automatic citation formatting', '{"display_order": 61}', '{}', false, false, '00000000-0000-0000-0000-000000000001'),
    ('enable_real_time_collaboration', 'false', 'boolean', 'features', 'Enable real-time collaboration features', '{"display_order": 62}', '{}', false, false, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (setting_key) DO NOTHING;

-- ====================================================================
-- MODEL CONFIGURATIONS SAMPLE DATA
-- ====================================================================

-- Insert default model configurations (using system user ID temporarily)
INSERT INTO public.model_configs (
    name,
    provider,
    model_name,
    parameters,
    is_active,
    is_default,
    priority_order,
    phase_compatibility,
    performance_metrics,
    cost_per_token,
    max_tokens,
    temperature,
    created_by,
    updated_by
) VALUES
    -- OpenAI Models
    ('GPT-4o Research', 'openai', 'gpt-4o', 
     '{"top_p": 0.9, "frequency_penalty": 0.1, "presence_penalty": 0.1}', 
     true, true, 1, 
     ARRAY['research_analysis', 'draft_composition', 'content_refinement']::academic_phase[], 
     '{"avg_response_time_ms": 2500, "success_rate": 0.98, "quality_score": 0.92}',
     0.00003, 128000, 0.7, 
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    ('GPT-4o-mini Writing', 'openai', 'gpt-4o-mini', 
     '{"top_p": 0.8, "frequency_penalty": 0.2}', 
     true, false, 2, 
     ARRAY['outline_generation', 'draft_composition', 'final_formatting']::academic_phase[], 
     '{"avg_response_time_ms": 1200, "success_rate": 0.99, "quality_score": 0.87}',
     0.000015, 128000, 0.6, 
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    -- OpenRouter Models
    ('Gemini 2.5 Pro Research', 'openrouter', 'google/gemini-2.5-pro', 
     '{"top_k": 40, "top_p": 0.95, "temperature": 0.8}', 
     true, true, 1, 
     ARRAY['research_analysis', 'academic_review', 'citation_integration']::academic_phase[], 
     '{"avg_response_time_ms": 3200, "success_rate": 0.96, "quality_score": 0.91}',
     0.000025, 128000, 0.8, 
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    ('Claude 3.5 Sonnet Writing', 'openrouter', 'anthropic/claude-3.5-sonnet', 
     '{"top_p": 0.9, "top_k": 50}', 
     true, false, 2, 
     ARRAY['draft_composition', 'content_refinement', 'academic_review']::academic_phase[], 
     '{"avg_response_time_ms": 2800, "success_rate": 0.97, "quality_score": 0.94}',
     0.00003, 200000, 0.7, 
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    -- Google Models
    ('Gemini 2.5 Pro Analysis', 'openrouter', 'google/gemini-2.5-pro', 
     '{"candidate_count": 1, "top_k": 32, "top_p": 0.9}', 
     true, true, 1, 
     ARRAY['research_analysis', 'outline_generation']::academic_phase[], 
     '{"avg_response_time_ms": 1800, "success_rate": 0.95, "quality_score": 0.88}',
     0.0000125, 32768, 0.8, 
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- PROMPT TEMPLATES SAMPLE DATA
-- ====================================================================

-- Insert sample prompt templates (using system user ID temporarily)
INSERT INTO public.prompt_templates (
    name,
    category,
    description,
    template_content,
    parameters,
    metadata,
    usage_count,
    is_public,
    is_verified,
    tags,
    created_by,
    updated_by
) VALUES
    -- Academic Writing Templates
    ('Academic Paper Introduction', 'academic_writing', 
     'Template untuk writing compelling academic paper introductions',
     'Write a compelling introduction untuk academic paper tentang {topic}. Include:\n\n1. Context and background information\n2. Problem statement\n3. Research gap identification\n4. Research objectives\n5. Paper structure overview\n\nTopic: {topic}\nField of study: {field}\nTarget audience: {audience}\nPaper length: {length} pages',
     '{"topic": {"type": "string", "required": true}, "field": {"type": "string", "required": true}, "audience": {"type": "string", "default": "academic researchers"}, "length": {"type": "integer", "default": 10}}',
     '{"estimated_output_length": 500, "difficulty": "intermediate"}', 
     15, true, true, 
     ARRAY['introduction', 'academic', 'research', 'paper'],
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    ('Literature Review Structure', 'research_analysis', 
     'Structured template untuk comprehensive literature reviews',
     'Create a comprehensive literature review untuk {topic} dengan structure berikut:\n\n1. **Theoretical Framework**\n   - Key concepts dan definitions\n   - Established theories dalam field\n\n2. **Current State of Research**\n   - Recent findings dan developments\n   - Methodological approaches\n\n3. **Research Gaps**\n   - Identified limitations dalam existing studies\n   - Areas requiring further investigation\n\n4. **Synthesis dan Analysis**\n   - Patterns dan trends\n   - Conflicting findings\n\nTopic: {topic}\nTime period: {time_period}\nNumber of sources: approximately {source_count}',
     '{"topic": {"type": "string", "required": true}, "time_period": {"type": "string", "default": "last 5 years"}, "source_count": {"type": "integer", "default": 30}}',
     '{"estimated_output_length": 2000, "difficulty": "advanced"}', 
     8, true, true, 
     ARRAY['literature', 'review', 'research', 'analysis'],
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    -- System Instructions
    ('Academic Persona Instructions', 'system_instructions', 
     'Comprehensive instructions untuk academic AI persona',
     'You are an expert academic researcher dan writer dengan specialization dalam {field}. Your role:\n\n**Writing Style:**\n- Use formal academic language\n- Maintain objective tone\n- Include proper citations\n- Follow {citation_style} format\n\n**Research Approach:**\n- Conduct thorough literature reviews\n- Apply critical thinking\n- Ensure methodological rigor\n- Consider ethical implications\n\n**Quality Standards:**\n- Ensure accuracy dan factual correctness\n- Maintain logical flow dan coherence\n- Use appropriate academic vocabulary\n- Follow discipline-specific conventions\n\nField: {field}\nCitation style: {citation_style}\nTarget audience: {target_audience}',
     '{"field": {"type": "string", "required": true}, "citation_style": {"type": "string", "default": "APA"}, "target_audience": {"type": "string", "default": "academic peers"}}',
     '{"usage_context": "system_prompt", "priority": "high"}', 
     25, true, true, 
     ARRAY['persona', 'academic', 'system', 'instructions'],
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    -- Quality Assessment
    ('Content Quality Evaluation', 'quality_assessment', 
     'Template untuk evaluating academic content quality',
     'Evaluate the quality dari following academic content menggunakan criteria berikut:\n\n**Structure dan Organization (25%)**\n- Logical flow dan coherence\n- Clear section divisions\n- Appropriate transitions\n\n**Content Quality (35%)**\n- Depth of analysis\n- Accuracy of information\n- Relevance to topic\n\n**Academic Standards (25%)**\n- Proper citations\n- Appropriate language\n- Methodological soundness\n\n**Innovation dan Contribution (15%)**\n- Original insights\n- Novel perspectives\n- Practical implications\n\nContent to evaluate:\n{content}\n\nProvide:\n1. Overall score (0-100)\n2. Detailed feedback untuk each criterion\n3. Specific suggestions untuk improvement\n4. Highlighted strengths',
     '{"content": {"type": "string", "required": true}}',
     '{"scoring_method": "weighted", "output_format": "detailed"}', 
     12, true, true, 
     ARRAY['quality', 'evaluation', 'assessment', 'feedback'],
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    
    -- Tool Instructions
    ('Web Search Instructions', 'tool_instructions', 
     'Instructions untuk effective web search dalam academic research',
     'When performing web search untuk academic research:\n\n**Search Strategy:**\n1. Use specific academic terminology\n2. Include field-specific keywords\n3. Search for peer-reviewed sources\n4. Look for recent publications (last {time_range} years)\n\n**Source Evaluation:**\n- Prioritize peer-reviewed journals\n- Check author credentials\n- Verify publication reputation\n- Ensure source relevance\n\n**Citation Requirements:**\n- Extract complete bibliographic information\n- Note DOI/URL untuk digital sources\n- Record access dates\n- Follow {citation_format} style\n\n**Quality Filters:**\n- Academic institutions (.edu)\n- Professional organizations\n- Government sources (.gov)\n- Reputable research databases\n\nSearch query: {query}\nField: {field}',
     '{"query": {"type": "string", "required": true}, "field": {"type": "string", "required": true}, "time_range": {"type": "integer", "default": 5}, "citation_format": {"type": "string", "default": "APA"}}',
     '{"tool_integration": "web_search", "priority": "high"}', 
     20, true, true, 
     ARRAY['web_search', 'tools', 'research', 'citations'],
     '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Count records in each table
-- SELECT 'admin_settings' as table_name, COUNT(*) as record_count FROM public.admin_settings
-- UNION ALL
-- SELECT 'model_configs' as table_name, COUNT(*) as record_count FROM public.model_configs  
-- UNION ALL
-- SELECT 'prompt_templates' as table_name, COUNT(*) as record_count FROM public.prompt_templates
-- ORDER BY table_name;

-- Show sample data
-- SELECT setting_key, setting_type, category, is_sensitive FROM public.admin_settings ORDER BY category, setting_key;
-- SELECT name, provider, model_name, is_default FROM public.model_configs ORDER BY provider, priority_order;
-- SELECT name, category, is_public, is_verified FROM public.prompt_templates ORDER BY category, name;

-- ====================================================================
-- COMMENTS
-- ====================================================================

COMMENT ON TABLE public.system_prompts IS 'Stores active system prompts untuk each academic phase dengan versioning';
COMMENT ON TABLE public.prompt_templates IS 'Library of reusable prompt templates dengan categorization';
COMMENT ON TABLE public.prompt_versions IS 'Version history untuk system prompts dengan rollback capability';
COMMENT ON TABLE public.model_configs IS 'AI model configurations dengan provider-specific parameters';
COMMENT ON TABLE public.admin_settings IS 'System-wide administrative configuration settings';
