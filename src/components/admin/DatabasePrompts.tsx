'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Database, Eye, Edit, Trash2, Plus, Save, Loader2, AlertTriangle, Check, X, FileText, Hash, Calendar, User, Layers2, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  version: number;
  priority_order: number;
  metadata?: any;
  parameters?: any;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface DatabasePromptsProps {
  session: any;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function DatabasePrompts({ session, authenticatedFetch }: DatabasePromptsProps) {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal states
  const [previewPrompt, setPreviewPrompt] = useState<SystemPrompt | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<SystemPrompt | null>(null);
  const [creatingPrompt, setCreatingPrompt] = useState(false);

  // Form states for editing/creating
  const [formData, setFormData] = useState<Partial<SystemPrompt>>({});
  const [saving, setSaving] = useState(false);

  // Load all prompts from database
  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/prompts?action=list-all');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load prompts');
      }

      if (result.success && result.data) {
        setPrompts(result.data.prompts || []);
        
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    if (session?.accessToken) {
      loadPrompts();
    }
  }, [session?.accessToken, loadPrompts]);

  // Handle save (create or update)
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const isUpdate = editingPrompt && !creatingPrompt;
      const url = '/api/admin/prompts';
      const method = isUpdate ? 'PUT' : 'POST';

      const requestData = isUpdate ? {
        id: editingPrompt.id,
        name: formData.name || editingPrompt.name,
        content: formData.content || editingPrompt.content,
        isActive: formData.is_active ?? editingPrompt.is_active,
        priorityOrder: formData.priority_order ?? editingPrompt.priority_order,
        metadata: formData.metadata || editingPrompt.metadata
      } : {
        content: formData.content || '',
        version: formData.version || '1',
        changeReason: 'System Prompt Update'
      };

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `Failed to ${isUpdate ? 'update' : 'create'} prompt`);
      }

      // Reload prompts
      await loadPrompts();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Close modals
      setEditingPrompt(null);
      setCreatingPrompt(false);
      setFormData({});

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingPrompt) return;

    try {
      setSaving(true);
      setError(null);

      const response = await authenticatedFetch(`/api/admin/prompts?id=${deletingPrompt.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete prompt');
      }

      // Reload prompts
      await loadPrompts();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Close delete dialog
      setDeletingPrompt(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (prompt: SystemPrompt) => {
    try {
      setError(null);

      const response = await authenticatedFetch('/api/admin/prompts', {
        method: 'PUT',
        body: JSON.stringify({
          id: prompt.id,
          isActive: !prompt.is_active
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to toggle active status');
      }

      // Reload prompts
      await loadPrompts();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle active status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading database prompts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Database Prompts</h3>
          <p className="text-sm text-muted-foreground">
            Manage all system prompts stored in Supabase database
          </p>
        </div>
        <Button
          onClick={() => {
            setCreatingPrompt(true);
            setFormData({
              name: 'New System Prompt',
              content: '',
              is_active: false,
              priority_order: 1,
              version: 1
            });
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Prompt
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Operation completed successfully!</AlertDescription>
        </Alert>
      )}

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {prompts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No prompts found in database
            </CardContent>
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Header: Name + Active Badge */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{prompt.name}</h4>
                  </div>
                  {prompt.is_active && (
                    <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                  )}
                </div>

                {/* Meta Info */}
                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  <div className="flex items-center gap-2">
                    <span>{prompt.content.length} characters</span>
                    <span>•</span>
                    <span>v{prompt.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Priority: {prompt.priority_order}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(prompt.created_at), {
                      addSuffix: true,
                      locale: idLocale
                    })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewPrompt(prompt)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingPrompt(prompt)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(prompt)}
                    className={`flex-1 ${prompt.is_active ? 'text-green-600' : 'text-muted-foreground'}`}
                  >
                    {prompt.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingPrompt(prompt)}
                    className="flex-1 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-[3px] border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Name</th>
                <th className="p-3 text-center text-sm font-medium">Version</th>
                <th className="p-3 text-center text-sm font-medium">Priority</th>
                <th className="p-3 text-center text-sm font-medium">Active</th>
                <th className="p-3 text-left text-sm font-medium">Created</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prompts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No prompts found in database
                  </td>
                </tr>
              ) : (
                prompts.map((prompt) => (
                  <tr key={prompt.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{prompt.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {prompt.content.length} characters
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">v{prompt.version}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm text-muted-foreground">{prompt.priority_order}</span>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(prompt)}
                        className={prompt.is_active ? 'text-green-600' : 'text-muted-foreground'}
                      >
                        {prompt.is_active ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <p className="text-muted-foreground">
                          {formatDistanceToNow(new Date(prompt.created_at), {
                            addSuffix: true,
                            locale: idLocale
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewPrompt(prompt)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPrompt(prompt);
                            setFormData(prompt);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingPrompt(prompt)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewPrompt} onOpenChange={() => setPreviewPrompt(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewPrompt?.name}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="outline">v{previewPrompt?.version}</Badge>
                {previewPrompt?.is_active && (
                  <Badge variant="default">Active</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Priority: {previewPrompt?.priority_order}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] w-full rounded-[3px] border p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {previewPrompt?.content}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewPrompt(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog
        open={!!editingPrompt || creatingPrompt}
        onOpenChange={() => {
          setEditingPrompt(null);
          setCreatingPrompt(false);
          setFormData({});
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {creatingPrompt ? 'Create New Prompt' : 'Edit System Prompt'}
            </DialogTitle>
            <DialogDescription>
              {creatingPrompt
                ? 'Create a new system prompt for the AI agent'
                : 'Modify the system prompt configuration'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="System prompt name"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  type="number"
                  value={formData.version || 1}
                  onChange={(e) => setFormData({ ...formData, version: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Order</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority_order || 1}
                  onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="active">Active Status</Label>
                <div className="flex items-center h-10">
                  <Button
                    variant={formData.is_active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className="w-full"
                  >
                    {formData.is_active ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Active
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Inactive
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Prompt Content</Label>
              <Textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the system prompt content..."
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {(formData.content || '').length} characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPrompt(null);
                setCreatingPrompt(false);
                setFormData({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPrompt} onOpenChange={() => setDeletingPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingPrompt?.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}