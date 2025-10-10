/**
 * Admin Dashboard: Contextual Guidance Rollout Monitoring
 *
 * Displays current rollout stage and metrics for contextual guidance feature.
 * Read-only view - stage updates via scripts/deploy/rollout-contextual-guidance.sh
 *
 * Part of: Task 4.4 - Rollout for Contextual Guidance
 * Reference: workflow_infrastructure/workflow_task/phase_04/task_4-4_rollout.md
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AdminAccess from '@/components/auth/AdminAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, BarChart, Clock, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { RolloutStage, ROLLOUT_PERCENTAGES } from '@/lib/ai/contextual-guidance/feature-flag';

// Rollout percentages for display
const ROLLOUT_PERCENTAGES_DISPLAY: Record<string, number> = {
  disabled: 0,
  shadow: 0,
  canary: 1,
  beta: 10,
  gradual_25: 25,
  gradual_50: 50,
  gradual_75: 75,
  enabled: 100
};

// Stage descriptions
const STAGE_DESCRIPTIONS: Record<string, string> = {
  disabled: 'Feature completely off',
  shadow: 'Detection runs but no injection (logging only)',
  canary: 'Internal testing with 1% of users',
  beta: 'A/B test with 10% of users',
  gradual_25: 'Gradual rollout to 25% of users',
  gradual_50: 'Gradual rollout to 50% of users',
  gradual_75: 'Gradual rollout to 75% of users',
  enabled: 'Full rollout to 100% of users'
};

// Get badge variant based on stage
function getStageBadgeVariant(stage: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (stage) {
    case 'disabled':
      return 'destructive';
    case 'shadow':
      return 'outline';
    case 'canary':
    case 'beta':
      return 'secondary';
    case 'enabled':
      return 'default';
    default:
      return 'secondary';
  }
}

async function ContextualGuidanceDashboard() {
  // Create Supabase admin client for server-side queries
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // Fetch current feature flag configuration
  const { data: flag, error: flagError } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_name', 'contextual_guidance')
    .single();

  // Fetch metrics from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: messages, error: metricsError } = await supabase
    .from('chat_messages')
    .select('metadata')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // Calculate metrics
  const totalMessages = messages?.length || 0;
  const guidedMessages = messages?.filter(
    (msg: any) => msg.metadata?.guidance?.triggered === true
  ).length || 0;

  const triggerPercentage = totalMessages > 0
    ? ((guidedMessages / totalMessages) * 100).toFixed(2)
    : '0.00';

  // Calculate average tokens for guided messages
  const guidedTokens = messages?.filter(
    (msg: any) => msg.metadata?.guidance?.triggered === true
  ).map((msg: any) => msg.metadata?.guidance?.token_count || 0) || [];

  const avgGuidedTokens = guidedTokens.length > 0
    ? Math.round(guidedTokens.reduce((a: number, b: number) => a + b, 0) / guidedTokens.length)
    : 0;

  // Calculate average retrieval time
  const retrievalTimes = messages?.filter(
    (msg: any) => msg.metadata?.guidance?.triggered === true
  ).map((msg: any) => msg.metadata?.guidance?.retrieval_time || 0) || [];

  const avgRetrievalTime = retrievalTimes.length > 0
    ? Math.round(retrievalTimes.reduce((a: number, b: number) => a + b, 0) / retrievalTimes.length)
    : 0;

  // Calculate trigger types distribution
  const triggerTypes = messages?.filter(
    (msg: any) => msg.metadata?.guidance?.triggered === true
  ).reduce((acc: any, msg: any) => {
    const type = msg.metadata?.guidance?.trigger_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const stage = flag?.rollout_stage || 'disabled';
  const percentage = ROLLOUT_PERCENTAGES_DISPLAY[stage] || 0;
  const description = STAGE_DESCRIPTIONS[stage] || 'Unknown stage';

  if (flagError) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/status">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Contextual Guidance Rollout</h1>
            <p className="text-muted-foreground">Error loading feature flag</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{flagError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin/status">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Dashboard
        </Link>
      </Button>

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Contextual Guidance Rollout</h1>
          <p className="text-muted-foreground">Monitoring rollout metrics and feature flag status</p>
        </div>
      </div>

      {/* Current Rollout Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Rollout Stage</CardTitle>
          <CardDescription>Feature flag configuration and user targeting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stage Badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stage</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStageBadgeVariant(stage)}>
                    {stage.toUpperCase()}
                  </Badge>
                  <span className="text-2xl font-bold">{percentage}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {flag?.updated_at ? new Date(flag.updated_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* User Overrides */}
            {(flag?.enabled_for_users?.length > 0 || flag?.disabled_for_users?.length > 0) && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">User Overrides</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {flag?.enabled_for_users && flag.enabled_for_users.length > 0 && (
                    <div className="rounded-[3px] border border-border bg-muted/20 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Enabled Users</p>
                      <p className="text-sm font-semibold mt-1">
                        {flag.enabled_for_users.length} user{flag.enabled_for_users.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  {flag?.disabled_for_users && flag.disabled_for_users.length > 0 && (
                    <div className="rounded-[3px] border border-border bg-muted/20 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Disabled Users</p>
                      <p className="text-sm font-semibold mt-1">
                        {flag.disabled_for_users.length} user{flag.disabled_for_users.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics (Last 7 Days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Metrics (Last 7 Days)
          </CardTitle>
          <CardDescription>
            {metricsError ? 'Error loading metrics' : `Based on ${totalMessages} messages`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metricsError ? (
            <p className="text-sm text-destructive">{metricsError.message}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Messages */}
              <div className="rounded-[3px] border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                </div>
                <p className="text-2xl font-bold mt-2">{totalMessages.toLocaleString()}</p>
              </div>

              {/* Guidance Triggered */}
              <div className="rounded-[3px] border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Guidance Triggered</p>
                </div>
                <p className="text-2xl font-bold mt-2">{guidedMessages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {triggerPercentage}% of messages
                </p>
              </div>

              {/* Avg Tokens (Guided) */}
              <div className="rounded-[3px] border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Avg Tokens</p>
                </div>
                <p className="text-2xl font-bold mt-2">{avgGuidedTokens}</p>
                <p className="text-xs text-muted-foreground mt-1">Per guided message</p>
              </div>

              {/* Avg Retrieval Time */}
              <div className="rounded-[3px] border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Avg Retrieval</p>
                </div>
                <p className="text-2xl font-bold mt-2">{avgRetrievalTime}ms</p>
                <p className="text-xs text-muted-foreground mt-1">Per retrieval</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trigger Types Distribution */}
      {Object.keys(triggerTypes || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trigger Types Distribution</CardTitle>
            <CardDescription>Breakdown of detection trigger types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(triggerTypes || {}).map(([type, count]: [string, any]) => (
                <div key={type} className="rounded-[3px] border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium text-muted-foreground capitalize">
                    {type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xl font-bold mt-1">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {guidedMessages > 0 ? ((count / guidedMessages) * 100).toFixed(1) : 0}% of triggers
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rollout Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rollout Management</CardTitle>
          <CardDescription>How to update rollout stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="rounded-[3px] border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium mb-2">Update Rollout Stage</p>
              <code className="text-xs bg-muted p-2 rounded block">
                ./scripts/deploy/rollout-contextual-guidance.sh &lt;stage&gt;
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Stages: shadow, canary, beta, gradual_25, gradual_50, gradual_75, enabled, disabled
              </p>
            </div>

            <div className="rounded-[3px] border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive mb-2">Emergency Rollback</p>
              <code className="text-xs bg-muted p-2 rounded block">
                ./scripts/deploy/rollback-contextual-guidance.sh
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Immediately disables feature for all users
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ContextualGuidancePage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <ContextualGuidanceDashboard />
    </AdminAccess>
  );
}
