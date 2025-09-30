'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAccess from '../../../src/components/auth/AdminAccess';
import { useAuth } from '../../../src/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cpu, History, RefreshCw, Save, Loader2, Zap, Plus, Check, Copy, Trash2, Layers, Database } from 'lucide-react';
import { OPENROUTER_MODELS } from '@/lib/ai/model-registry';
import DatabasePrompts from '@/components/admin/DatabasePrompts';

// Default system prompt as per specifications
const DEFAULT_SYSTEM_PROMPT = `You are Makalah AI, an Academic Research Agent specialized in Bahasa Indonesia academic paper development through a structured 7-phase research methodology.

## 7-PHASE ACADEMIC METHODOLOGY:
1. **Topic Clarification & Research Planning**
   - Interactive dialogue to refine topic and research scope
   - Web search for emerging trends and research gaps
   - Methodology approach definition

2. **Literature Research & Data Collection**
   - Comprehensive literature search via web search
   - Academic source prioritization (sinta, garuda, repositories)
   - Research gap identification and synthesis

3. **Framework Analysis & Structure Planning**
   - Transform literature themes into logical framework
   - Interactive outline development
   - Structural flow optimization

4. **Content Development & Draft Writing**
   - Collaborative content development
   - Academic writing standards adherence
   - Research framework consistency

5. **Citation Synthesis & Reference Management**
   - Citation integration with draft content
   - DOI verification and bibliography
   - Reference style consistency

6. **Review & Quality Assurance**
   - Comprehensive deliverable review
   - Academic standards verification
   - Cross-phase consistency check

7. **Finalization & Submission Preparation**
   - Final formatting and validation
   - Submission checklist completion
   - Publication readiness assessment

## BAHASA INDONESIA PROTOCOL:
- ALWAYS communicate in Bahasa Indonesia
- Adapt to user's language style (formal/informal)
- Technical terms remain in original language
- Academic outputs use formal Indonesian

## HITL APPROVAL MECHANISM:
- Use EXACT pattern: "Konfirmasi: Apakah Anda setuju dengan hasil fase [N]?"
- Wait for user approval: setuju, ya, ok, lanjut, oke
- Execute complete_phase_X tool after approval
- No auto-advance between phases

## WEB SEARCH PRIORITIZATION:
1. Indonesian databases: sinta.kemdikbud.go.id, garuda, repository
2. International: ieee.org, jstor.org, springer.com
3. University repositories: .edu, .ac.id domains

## TOOLS AVAILABLE:
- complete_phase_1 through complete_phase_7
- web_search for research needs

Always maintain academic integrity with evidence-based research, proper citations, and collaborative workflow progression.`;

// Default prompt history (will be replaced by API data)
const defaultPromptHistory = [
  { version: "v2.1", date: "2025-01-26", description: "Current - Enhanced academic structure" },
  { version: "v2.0", date: "2025-01-20", description: "Added 7-phase methodology" },
  { version: "v1.5", date: "2025-01-15", description: "Improved Indonesian language support" },
  { version: "v1.0", date: "2025-01-10", description: "Initial system prompt" },
];

function AdminPromptContent() {
  const { session, refreshToken } = useAuth();

  // Form state
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptVersion, setPromptVersion] = useState("v2.1");

  // Enhanced prompt management state
  const [promptHistory, setPromptHistory] = useState<any[]>([]);
  const [originalPrompt, setOriginalPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptValidation, setPromptValidation] = useState<{ valid: boolean; issues: string[] } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Template management state
  const [selectedModel, setSelectedModel] = useState<string>('moonshotai/kimi-k2-0905');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateContent, setTemplateContent] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateAction, setTemplateAction] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('system-prompt');

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  // Circuit breaker for token refresh
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const MAX_REFRESH_ATTEMPTS = 3;
  const REFRESH_COOLDOWN = 30000; // 30 seconds

  // Helper function for authenticated API calls with token refresh and retry
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> => {
    if (!session?.accessToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle 403 with retry logic (max 1 retry)
    if (response.status === 403 && retryCount === 0) {
      console.log('[authenticatedFetch] Got 403, attempting token refresh...');

      // Circuit breaker: Check if we're in cooldown period
      const now = Date.now();
      if (lastRefreshTime > 0 && (now - lastRefreshTime) < REFRESH_COOLDOWN) {
        const remainingTime = Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000);
        console.warn(`[authenticatedFetch] 403 refresh in cooldown. Wait ${remainingTime} seconds.`);
        throw new Error(`Token refresh rate limited. Please wait ${remainingTime} seconds before trying again.`);
      }

      // Circuit breaker: Check if we've exceeded max attempts
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.warn('[authenticatedFetch] Max 403 refresh attempts exceeded');
        setRefreshAttempts(0);
        setLastRefreshTime(now);
        throw new Error('Too many token refresh attempts. Please wait and try again.');
      }

      // Increment refresh attempts
      setRefreshAttempts(prev => prev + 1);
      setLastRefreshTime(now);

      const refreshed = await refreshToken();
      if (refreshed) {
        // Reset circuit breaker on successful refresh
        setRefreshAttempts(0);
        console.log('[authenticatedFetch] 403 token refresh successful, circuit breaker reset');
        return authenticatedFetch(url, options, retryCount + 1);
      }
    }

    // Handle 429 rate limit errors (no retry to prevent further rate limiting)
    if (response.status === 429) {
      console.warn('[authenticatedFetch] Rate limit reached, stopping retry attempts');
      throw new Error('Rate limit reached. Please wait before trying again.');
    }

    return response;
  }, [session?.accessToken, refreshAttempts, lastRefreshTime, refreshToken]);

  const loadPromptData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/prompts');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load prompt data');
      }

      if (result.success && result.data) {
        // Load current prompt
        if (result.data.current) {
          setSystemPrompt(result.data.current.content || DEFAULT_SYSTEM_PROMPT);
          setPromptVersion(result.data.current.version || 'v2.1');
          setOriginalPrompt(result.data.current.content || DEFAULT_SYSTEM_PROMPT);
        }

        // Load prompt history
        if (result.data.history && result.data.history.length > 0) {
          setPromptHistory(result.data.history);
        } else {
          setPromptHistory(defaultPromptHistory);
        }

        console.log('✅ Prompt data loaded:', {
          currentVersion: result.data.current?.version,
          historyCount: result.data.history?.length || 0
        });
      }

    } catch (err) {
      console.error('Error loading prompt data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompt data');
      // Use defaults on error
      setPromptHistory(defaultPromptHistory);
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  // Load templates for selected model
  const loadTemplates = useCallback(async (modelSlug?: string) => {
    if (!session?.accessToken) return;

    try {
      setTemplatesLoading(true);
      setError(null);

      const url = modelSlug
        ? `/api/admin/templates?modelSlug=${encodeURIComponent(modelSlug)}`
        : '/api/admin/templates';

      const response = await authenticatedFetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load templates');
      }

      if (result.success && result.data) {
        const modelTemplates = result.data.templates || [];
        setTemplates(modelTemplates);

        // Select active template if exists
        const activeTemplate = modelTemplates.find((t: any) => t.is_active);
        if (activeTemplate) {
          setSelectedTemplate(activeTemplate);
          setTemplateContent(activeTemplate.template_content);
        } else if (modelTemplates.length > 0) {
          // Select first template if no active template
          setSelectedTemplate(modelTemplates[0]);
          setTemplateContent(modelTemplates[0].template_content);
        } else {
          setSelectedTemplate(null);
          setTemplateContent('');
        }

        console.log('✅ Templates loaded:', {
          modelSlug,
          count: modelTemplates.length,
          activeTemplate: activeTemplate?.template_name
        });
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      setTemplates([]);
      setSelectedTemplate(null);
      setTemplateContent('');
    } finally {
      setTemplatesLoading(false);
    }
  }, [session?.accessToken, authenticatedFetch]);

  // Academic content validation function
  const validateAcademicContent = (content: string): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];

    // Check for 7-phase methodology keywords
    const phaseKeywords = ['klarifikasi', 'riset', 'kerangka', 'pengembangan', 'sintesis', 'review', 'finalisasi'];
    const foundPhases = phaseKeywords.filter(keyword =>
      content.toLowerCase().includes(keyword)
    ).length;

    if (foundPhases < 3) {
      issues.push('Prompt tidak mengandung cukup referensi ke metodologi 7-fase');
    }

    // Check for Indonesian academic keywords
    const academicKeywords = ['akademik', 'penelitian', 'analisis', 'makalah', 'ilmiah'];
    const foundAcademic = academicKeywords.filter(keyword =>
      content.toLowerCase().includes(keyword)
    ).length;

    if (foundAcademic < 2) {
      issues.push('Prompt kurang mengandung terminologi akademik Indonesia');
    }

    // Check for Indonesian language indicators
    const indonesianIndicators = ['anda', 'yang', 'dan', 'dengan', 'untuk', 'dalam'];
    const foundIndonesian = indonesianIndicators.filter(word =>
      content.toLowerCase().includes(word)
    ).length;

    if (foundIndonesian < 4) {
      issues.push('Prompt mungkin tidak menggunakan bahasa Indonesia yang memadai');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  };

  // Real-time validation when prompt changes
  useEffect(() => {
    if (systemPrompt && systemPrompt !== DEFAULT_SYSTEM_PROMPT) {
      const validation = validateAcademicContent(systemPrompt);
      setPromptValidation(validation);
    } else {
      setPromptValidation(null);
    }
  }, [systemPrompt]);

  // Load prompt data on mount
  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    loadPromptData();
    loadTemplates(selectedModel);
  }, [session?.accessToken, loadPromptData, loadTemplates, selectedModel]);

  // Reload templates when model changes
  useEffect(() => {
    if (session?.accessToken && selectedModel) {
      loadTemplates(selectedModel);
    }
  }, [selectedModel, session?.accessToken, loadTemplates]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      // Check if prompt has changed
      if (systemPrompt === originalPrompt) {
        setError('System prompt is already up to date');
        setSaving(false);
        return;
      }

      const promptUpdateData = {
        content: systemPrompt,
        version: String(promptVersion || 'v2.1'),
        changeReason: 'Admin dashboard update'
      };

      console.log('🔄 Saving system prompt:', {
        contentLength: promptUpdateData.content?.length,
        version: promptUpdateData.version
      });

      const promptResponse = await authenticatedFetch('/api/admin/prompts', {
        method: 'POST',
        body: JSON.stringify(promptUpdateData),
      });

      const promptResult = await promptResponse.json();

      if (!promptResponse.ok) {
        throw new Error(promptResult.error?.message || 'Failed to save system prompt');
      }

      if (promptResult.success && promptResult.data?.prompt) {
        // Update local state with fresh data from server
        const freshContent = promptResult.data.prompt.content;
        setSystemPrompt(freshContent);
        setPromptVersion(promptResult.data.version);
        setOriginalPrompt(freshContent);
        setHasUnsavedChanges(false);  // Clear unsaved changes flag

        // Reload prompt data to get updated history
        await loadPromptData();
      }

      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Error saving system prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to save system prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setError(null);

      // Try to save DEFAULT_SYSTEM_PROMPT to database
      try {
        const saveResponse = await authenticatedFetch('/api/admin/prompts', {
          method: 'POST',
          body: JSON.stringify({
            content: DEFAULT_SYSTEM_PROMPT,
            version: 'v2.1',
            changeReason: 'Reset to default fallback prompt'
          })
        });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            // Update UI with saved data
            setSystemPrompt(saveResult.data.prompt.content);
            setPromptVersion(saveResult.data.version);
            setOriginalPrompt(saveResult.data.prompt.content);
            await loadPromptData();
          }
        }
      } catch (saveError) {
        console.warn('Could not save to database, using local fallback:', saveError);
        // Fallback to local state only
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        setPromptVersion('v2.1-local');
        setOriginalPrompt(DEFAULT_SYSTEM_PROMPT);
      }

      setError(null);
      setSaveSuccess(false);
      setPromptValidation(null);

    } catch (err) {
      console.error('Error resetting prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset prompt');

      // Ultimate fallback
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setPromptVersion('v2.1-fallback');
      setOriginalPrompt(DEFAULT_SYSTEM_PROMPT);
    }
  };

  // Template management functions
  const handleActivateTemplate = async (templateId: string) => {
    try {
      setTemplateAction('activating');
      setError(null);

      // First, get the template content
      const template = templates.find((t: any) => t.id === templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Confirm with user that this will replace the main system prompt
      if (!confirm(`This will replace your current system prompt with the "${template.template_name}" template. Continue?`)) {
        return;
      }

      // Step 1: Update the main system prompt with template content
      setSystemPrompt(template.template_content);

      // Step 2: Save to database as main system prompt
      const saveResponse = await authenticatedFetch('/api/admin/prompts', {
        method: 'PUT',
        body: JSON.stringify({
          content: template.template_content,
          name: `System Prompt from ${template.template_name}`,
          phase: 'system_instructions'
        })
      });

      if (!saveResponse.ok) {
        const saveResult = await saveResponse.json();
        throw new Error(saveResult.error?.message || 'Failed to update system prompt');
      }

      // Step 3: Mark template as active (optional - for visual indication)
      const response = await authenticatedFetch('/api/admin/templates', {
        method: 'PUT',
        body: JSON.stringify({
          modelSlug: selectedModel,
          templateId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.warn('Template activation flag update failed, but system prompt was updated');
      }

      // Update local state
      setOriginalPrompt(template.template_content);
      setHasUnsavedChanges(false);

      // Reload templates to get updated state
      await loadTemplates(selectedModel);
      setSaveSuccess(true);
      setError(null);

      // Switch to system prompt tab to show the change
      setActiveTab('system-prompt');

      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Error activating template:', err);
      setError(err instanceof Error ? err.message : 'Failed to activate template');
    } finally {
      setTemplateAction(null);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setTemplateAction('creating');
      setError(null);

      if (!newTemplateName.trim()) {
        setError('Template name is required');
        return;
      }

      if (!templateContent.trim()) {
        setError('Template content is required');
        return;
      }

      const response = await authenticatedFetch('/api/admin/templates', {
        method: 'POST',
        body: JSON.stringify({
          modelSlug: selectedModel,
          templateName: newTemplateName.trim(),
          templateContent: templateContent,
          isDefault: false
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create template');
      }

      // Reset form and reload templates
      setNewTemplateName('');
      setShowCreateTemplate(false);
      await loadTemplates(selectedModel);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Error creating template:', err);
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setTemplateAction(null);
    }
  };

  const handleGenerateDefaults = async () => {
    try {
      setTemplateAction('generating');
      setError(null);

      const response = await authenticatedFetch('/api/admin/templates?action=generate-defaults', {
        method: 'POST',
        body: JSON.stringify({
          forceRegenerate: true
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to generate default templates');
      }

      // Reload templates
      await loadTemplates(selectedModel);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Error generating defaults:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate default templates');
    } finally {
      setTemplateAction(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    // Show the delete confirmation dialog
    setTemplateToDelete({ id: templateId, name: templateName });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setTemplateAction('deleting');
      setError(null);

      const response = await authenticatedFetch(`/api/admin/templates?templateId=${templateToDelete.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete template');
      }

      // Reload templates
      await loadTemplates(selectedModel);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setTemplateAction(null);
    }
  };

  const handleCopyToSystemPrompt = () => {
    if (selectedTemplate) {
      setSystemPrompt(selectedTemplate.template_content);
      setActiveTab('system-prompt');
      // Clear any existing errors
      setError(null);
      setSaveSuccess(false);
      // Mark as having unsaved changes
      setHasUnsavedChanges(true);
    }
  };

  const promptCharCount = systemPrompt.length;
  const templateCharCount = templateContent.length;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Memuat system prompt…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Cpu className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">System Prompt & Templates</h1>
          <p className="text-muted-foreground">Atur instruksi dasar dan template model-specific untuk akademik workflow</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Operation completed successfully!</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system-prompt" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            System Prompt
            {hasUnsavedChanges && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Unsaved
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Model Templates
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system-prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">System Prompt</CardTitle>
                    <CardDescription>Tetapkan instruksi dasar untuk Makalah AI.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {hasUnsavedChanges && (
                    <Badge variant="destructive" className="text-xs font-medium">
                      Unsaved Changes
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-medium">
                    {promptCharCount} karakter
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium">
                    Versi {promptVersion}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPromptHistory((prev) => !prev)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    {showPromptHistory ? 'Sembunyikan riwayat' : 'Lihat riwayat'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPromptHistory && (
                <div className="rounded-[3px] border border-dashed border-border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Riwayat versi prompt</p>
                  <div className="mt-3 space-y-2">
                    {(promptHistory.length ? promptHistory : defaultPromptHistory).map((item) => (
                      <div
                        key={item.version}
                        className="flex flex-col gap-1 rounded-[3px] border border-transparent bg-background px-3 py-2 transition-colors hover:border-border"
                      >
                        <div className="flex items-center justify-between text-sm font-medium text-foreground">
                          <span>{item.version}</span>
                          <span className="text-xs text-muted-foreground">{item.date}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="system-prompt">Instruksi sistem</Label>
                <Textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(event) => {
                    setSystemPrompt(event.target.value);
                    setHasUnsavedChanges(event.target.value !== originalPrompt);
                  }}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Masukkan system prompt untuk AI agent…"
                />
                <p className="text-xs text-muted-foreground">
                  Prompt ini menjadi referensi utama bagi agent saat memandu 7 fase penulisan.
                </p>
              </div>
              {promptValidation && !promptValidation.valid && (
                <Alert variant="default">
                  <AlertTitle>Perlu penyesuaian</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {promptValidation.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="pt-6 border-t border-border">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="text-xs"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset to default
                  </Button>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="min-w-[140px]"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Prompt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">Model-Specific Templates</CardTitle>
                    <CardDescription>Kelola template system prompt yang dioptimalkan untuk setiap model AI.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateDefaults}
                    disabled={templateAction === 'generating'}
                  >
                    {templateAction === 'generating' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate Defaults
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model-select">Pilih Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENROUTER_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex items-center gap-2">
                          <span>{model.label}</span>
                          {model.recommended && (
                            <Badge variant="secondary" className="text-xs">Recommended</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Templates List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Templates untuk {OPENROUTER_MODELS.find(m => m.value === selectedModel)?.label}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateTemplate(true)}
                    disabled={templatesLoading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Template
                  </Button>
                </div>

                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading templates...</span>
                    </div>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No templates found for this model.</p>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateDefaults()}
                      disabled={templateAction === 'generating'}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Generate Default Template
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`rounded-[3px] border p-4 transition-colors ${
                          template.is_active ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{template.template_name}</h4>
                              {template.is_active && (
                                <Badge variant="default" className="text-xs">
                                  <Check className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              )}
                              {template.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {template.template_content.length} characters
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(template.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!template.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivateTemplate(template.id)}
                                disabled={templateAction === 'activating'}
                                title="Replace main system prompt with this template"
                              >
                                {templateAction === 'activating' ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="mr-1 h-3 w-3" />
                                )}
                                Use as System Prompt
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setTemplateContent(template.template_content);
                              }}
                              title="Copy template content"
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </Button>
                            {!template.is_default && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTemplate(template.id, template.template_name)}
                                disabled={templateAction === 'deleting'}
                                className="text-muted-foreground hover:text-foreground"
                                title="Delete template"
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Template Content Editor */}
              {selectedTemplate && !showCreateTemplate && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">Template Content</h3>
                        <p className="text-sm text-muted-foreground">{selectedTemplate.template_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {templateCharCount} characters
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyToSystemPrompt}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy to System Prompt
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      rows={15}
                      className="font-mono text-sm"
                      placeholder="Template content..."
                      readOnly
                    />
                  </div>
                </>
              )}

              {/* Create New Template Form */}
              {showCreateTemplate && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Create New Template</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCreateTemplate(false);
                          setNewTemplateName('');
                          if (selectedTemplate) {
                            setTemplateContent(selectedTemplate.template_content);
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <input
                        id="template-name"
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-[3px]"
                        placeholder="e.g., Custom Academic Template"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-content">Template Content</Label>
                      <Textarea
                        id="template-content"
                        value={templateContent}
                        onChange={(e) => setTemplateContent(e.target.value)}
                        rows={15}
                        className="font-mono text-sm"
                        placeholder="Enter template content..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateTemplate(false);
                          setNewTemplateName('');
                          if (selectedTemplate) {
                            setTemplateContent(selectedTemplate.template_content);
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTemplate}
                        disabled={templateAction === 'creating' || !newTemplateName.trim() || !templateContent.trim()}
                      >
                        {templateAction === 'creating' ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Create Template
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">Database Management</CardTitle>
                    <CardDescription>View and manage all system prompts stored in Supabase database.</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DatabasePrompts
                session={session}
                authenticatedFetch={authenticatedFetch}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-sm rounded-[3px] sm:rounded-[3px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus template &quot;{templateToDelete?.name}&quot;?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={templateAction === 'deleting'}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              disabled={templateAction === 'deleting'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {templateAction === 'deleting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminPromptPage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <AdminPromptContent />
    </AdminAccess>
  );
}