/**
 * Prompt Template Versioning System
 * Production-ready versioning with rollback, migration, and audit trails
 * 
 * Based on Vercel AI SDK v5 patterns from:
 * - /documentation/docs/03-ai-sdk-core/20-prompt-engineering.mdx
 * - /documentation/docs/06-advanced/01-prompt-engineering.mdx
 */

import type { PromptTemplate } from './template-registry';

/**
 * Version metadata interface
 */
export interface VersionMetadata {
  /** Version identifier */
  version: string;
  
  /** Previous version */
  previousVersion?: string;
  
  /** Next version (if not latest) */
  nextVersion?: string;
  
  /** Version status */
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  
  /** Release date */
  releaseDate: Date;
  
  /** Deprecation date (if deprecated) */
  deprecationDate?: Date;
  
  /** Change summary */
  changeSummary: string;
  
  /** Detailed changelog */
  changelog: ChangeLogEntry[];
  
  /** Compatibility information */
  compatibility: CompatibilityInfo;
  
  /** Migration information */
  migration: MigrationInfo;
  
  /** Performance metrics */
  performance: VersionPerformanceMetrics;
  
  /** Approval information */
  approval: ApprovalInfo;
}

/**
 * Change log entry interface
 */
export interface ChangeLogEntry {
  /** Change type */
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  
  /** Change description */
  description: string;
  
  /** Impact level */
  impact: 'breaking' | 'major' | 'minor' | 'patch';
  
  /** Affected components */
  affectedComponents: string[];
  
  /** Migration notes */
  migrationNotes?: string;
}

/**
 * Compatibility information
 */
export interface CompatibilityInfo {
  /** Is backward compatible */
  backwardCompatible: boolean;
  
  /** Is forward compatible */
  forwardCompatible: boolean;
  
  /** Compatible versions */
  compatibleVersions: string[];
  
  /** Incompatible versions */
  incompatibleVersions: string[];
  
  /** Breaking changes */
  breakingChanges: string[];
  
  /** Compatibility notes */
  notes: string[];
}

/**
 * Migration information
 */
export interface MigrationInfo {
  /** Migration required */
  migrationRequired: boolean;
  
  /** Migration type */
  migrationType: 'automatic' | 'assisted' | 'manual';
  
  /** Migration script available */
  migrationScriptAvailable: boolean;
  
  /** Migration instructions */
  migrationInstructions: string[];
  
  /** Migration warnings */
  migrationWarnings: string[];
  
  /** Estimated migration time */
  estimatedMigrationTime: string;
}

/**
 * Version performance metrics
 */
export interface VersionPerformanceMetrics {
  /** Success rate */
  successRate: number;
  
  /** Average quality score */
  averageQualityScore: number;
  
  /** Average token usage */
  averageTokenUsage: number;
  
  /** Average response time */
  averageResponseTime: number;
  
  /** Usage count */
  usageCount: number;
  
  /** Error rate */
  errorRate: number;
  
  /** User satisfaction */
  userSatisfaction: number;
}

/**
 * Approval information
 */
export interface ApprovalInfo {
  /** Approval status */
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  
  /** Approved by */
  approvedBy?: string;
  
  /** Approval date */
  approvalDate?: Date;
  
  /** Reviewer comments */
  reviewerComments: string[];
  
  /** Approval criteria met */
  approvalCriteriaMet: boolean;
  
  /** Quality gate passed */
  qualityGatePassed: boolean;
}

/**
 * Versioned template interface
 */
export interface VersionedTemplate {
  /** Base template */
  template: PromptTemplate;
  
  /** Version metadata */
  versionMetadata: VersionMetadata;
  
  /** Version history */
  versionHistory: VersionMetadata[];
  
  /** Audit trail */
  auditTrail: AuditEntry[];
}

/**
 * Audit entry interface
 */
export interface AuditEntry {
  /** Audit entry ID */
  id: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Action performed */
  action: 'created' | 'updated' | 'published' | 'deprecated' | 'archived' | 'rollback' | 'migration';
  
  /** User who performed action */
  user: string;
  
  /** Source version */
  sourceVersion?: string;
  
  /** Target version */
  targetVersion?: string;
  
  /** Action details */
  details: string;
  
  /** Impact assessment */
  impact: 'low' | 'medium' | 'high' | 'critical';
  
  /** Rollback information */
  rollbackInfo?: RollbackInfo;
}

/**
 * Rollback information
 */
export interface RollbackInfo {
  /** Reason for rollback */
  reason: string;
  
  /** Issues encountered */
  issues: string[];
  
  /** Recovery steps */
  recoverySteps: string[];
  
  /** Rollback success */
  success: boolean;
  
  /** Post-rollback status */
  postRollbackStatus: string;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  /** Source version */
  sourceVersion: string;
  
  /** Target version */
  targetVersion: string;
  
  /** Content differences */
  contentDifferences: ContentDifference[];
  
  /** Metadata changes */
  metadataChanges: MetadataChange[];
  
  /** Variable changes */
  variableChanges: VariableChange[];
  
  /** Performance impact */
  performanceImpact: PerformanceImpact;
  
  /** Migration recommendations */
  migrationRecommendations: string[];
}

/**
 * Content difference interface
 */
export interface ContentDifference {
  /** Difference type */
  type: 'addition' | 'deletion' | 'modification';
  
  /** Location in content */
  location: string;
  
  /** Old content */
  oldContent?: string;
  
  /** New content */
  newContent?: string;
  
  /** Impact description */
  impact: string;
}

/**
 * Metadata change interface
 */
export interface MetadataChange {
  /** Field changed */
  field: string;
  
  /** Old value */
  oldValue: any;
  
  /** New value */
  newValue: any;
  
  /** Change significance */
  significance: 'breaking' | 'major' | 'minor' | 'patch';
}

/**
 * Variable change interface
 */
export interface VariableChange {
  /** Variable name */
  variableName: string;
  
  /** Change type */
  changeType: 'added' | 'removed' | 'modified' | 'requirement_changed';
  
  /** Old requirement level */
  oldRequirement?: 'required' | 'optional';
  
  /** New requirement level */
  newRequirement?: 'required' | 'optional';
  
  /** Migration impact */
  migrationImpact: string;
}

/**
 * Performance impact assessment
 */
export interface PerformanceImpact {
  /** Token usage change */
  tokenUsageChange: number;
  
  /** Quality score change */
  qualityScoreChange: number;
  
  /** Response time change */
  responseTimeChange: number;
  
  /** Success rate change */
  successRateChange: number;
  
  /** Overall impact */
  overallImpact: 'positive' | 'negative' | 'neutral' | 'mixed';
  
  /** Impact description */
  impactDescription: string;
}

/**
 * Version deployment configuration
 */
export interface DeploymentConfig {
  /** Deployment strategy */
  strategy: 'immediate' | 'gradual' | 'canary' | 'blue_green';
  
  /** Rollout percentage (for gradual deployment) */
  rolloutPercentage?: number;
  
  /** Canary group (for canary deployment) */
  canaryGroup?: string[];
  
  /** Success criteria */
  successCriteria: {
    minimumSuccessRate: number;
    maximumErrorRate: number;
    minimumQualityScore: number;
  };
  
  /** Rollback triggers */
  rollbackTriggers: {
    successRateThreshold: number;
    errorRateThreshold: number;
    qualityScoreThreshold: number;
  };
  
  /** Monitoring duration */
  monitoringDuration: number;
}

/**
 * Template Versioning System Class
 */
export class TemplateVersioningSystem {
  private versionedTemplates: Map<string, VersionedTemplate> = new Map();
  private versionIndex: Map<string, Map<string, VersionMetadata>> = new Map();
  private auditTrail: Map<string, AuditEntry[]> = new Map();
  private activeVersions: Map<string, string> = new Map();

  constructor() {
    this.initializeVersioningSystem();
  }

  /**
   * Create new template version
   */
  async createVersion(
    templateId: string,
    template: PromptTemplate,
    changeSummary: string,
    changelog: ChangeLogEntry[],
    user: string
  ): Promise<VersionMetadata> {
    const existingVersioned = this.versionedTemplates.get(templateId);
    const previousVersion = existingVersioned?.versionMetadata.version;
    
    // Determine new version number
    const newVersion = this.calculateNextVersion(templateId, changelog);
    
    // Create version metadata
    const versionMetadata: VersionMetadata = {
      version: newVersion,
      previousVersion,
      status: 'draft',
      releaseDate: new Date(),
      changeSummary,
      changelog,
      compatibility: this.analyzeCompatibility(templateId, template, changelog),
      migration: this.analyzeMigration(templateId, template, changelog),
      performance: this.initializePerformanceMetrics(),
      approval: {
        status: 'pending',
        reviewerComments: [],
        approvalCriteriaMet: false,
        qualityGatePassed: false
      }
    };

    // Create versioned template
    const versionedTemplate: VersionedTemplate = {
      template: { ...template, version: newVersion },
      versionMetadata,
      versionHistory: existingVersioned?.versionHistory || [],
      auditTrail: []
    };

    // Add previous version to history
    if (existingVersioned) {
      versionedTemplate.versionHistory.push(existingVersioned.versionMetadata);
    }

    // Store version
    this.versionedTemplates.set(templateId, versionedTemplate);
    this.updateVersionIndex(templateId, versionMetadata);

    // Create audit entry
    this.addAuditEntry(templateId, {
      id: this.generateAuditId(),
      timestamp: new Date(),
      action: 'created',
      user,
      targetVersion: newVersion,
      details: `Created version ${newVersion}: ${changeSummary}`,
      impact: this.calculateImpact(changelog)
    });

    return versionMetadata;
  }

  /**
   * Publish version (make it active)
   */
  async publishVersion(
    templateId: string,
    version: string,
    user: string,
    deploymentConfig?: DeploymentConfig
  ): Promise<void> {
    const versionedTemplate = this.versionedTemplates.get(templateId);
    if (!versionedTemplate || versionedTemplate.versionMetadata.version !== version) {
      throw new Error(`Version ${version} not found for template ${templateId}`);
    }

    // Check approval status
    if (versionedTemplate.versionMetadata.approval.status !== 'approved') {
      throw new Error(`Version ${version} has not been approved for publication`);
    }

    // Update version status
    versionedTemplate.versionMetadata.status = 'active';
    versionedTemplate.versionMetadata.releaseDate = new Date();

    // Update active version
    const previousActiveVersion = this.activeVersions.get(templateId);
    this.activeVersions.set(templateId, version);

    // Deprecate previous active version if exists
    if (previousActiveVersion) {
      await this.deprecateVersion(templateId, previousActiveVersion, user, 'New version published');
    }

    // Create audit entry
    this.addAuditEntry(templateId, {
      id: this.generateAuditId(),
      timestamp: new Date(),
      action: 'published',
      user,
      sourceVersion: previousActiveVersion,
      targetVersion: version,
      details: `Published version ${version}, deprecated ${previousActiveVersion || 'none'}`,
      impact: 'high'
    });

    // If deployment config provided, handle deployment strategy
    if (deploymentConfig) {
      await this.handleDeploymentStrategy(templateId, version, deploymentConfig, user);
    }
  }

  /**
   * Rollback to previous version
   */
  async rollbackVersion(
    templateId: string,
    targetVersion: string,
    reason: string,
    user: string
  ): Promise<void> {
    const versionedTemplate = this.versionedTemplates.get(templateId);
    if (!versionedTemplate) {
      throw new Error(`Template ${templateId} not found`);
    }

    const currentVersion = this.activeVersions.get(templateId);
    if (!currentVersion) {
      throw new Error(`No active version found for template ${templateId}`);
    }

    // Validate target version exists
    const targetVersionData = this.getVersionMetadata(templateId, targetVersion);
    if (!targetVersionData) {
      throw new Error(`Target version ${targetVersion} not found`);
    }

    const rollbackInfo: RollbackInfo = {
      reason,
      issues: [],
      recoverySteps: [
        `Rollback from ${currentVersion} to ${targetVersion}`,
        'Validate rollback success',
        'Monitor system stability'
      ],
      success: false,
      postRollbackStatus: 'pending'
    };

    try {
      // Perform rollback
      this.activeVersions.set(templateId, targetVersion);
      
      // Update version statuses
      const currentVersionData = this.getVersionMetadata(templateId, currentVersion);
      if (currentVersionData) {
        currentVersionData.status = 'deprecated';
        currentVersionData.deprecationDate = new Date();
      }

      targetVersionData.status = 'active';
      
      rollbackInfo.success = true;
      rollbackInfo.postRollbackStatus = 'active';

      // Create audit entry
      this.addAuditEntry(templateId, {
        id: this.generateAuditId(),
        timestamp: new Date(),
        action: 'rollback',
        user,
        sourceVersion: currentVersion,
        targetVersion: targetVersion,
        details: `Rolled back from ${currentVersion} to ${targetVersion}: ${reason}`,
        impact: 'critical',
        rollbackInfo
      });

    } catch (error) {
      rollbackInfo.success = false;
      rollbackInfo.issues.push(error instanceof Error ? error.message : 'Unknown error');
      rollbackInfo.postRollbackStatus = 'failed';
      
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare two versions
   */
  compareVersions(
    templateId: string,
    sourceVersion: string,
    targetVersion: string
  ): VersionComparison {
    const sourceTemplate = this.getVersion(templateId, sourceVersion);
    const targetTemplate = this.getVersion(templateId, targetVersion);

    if (!sourceTemplate || !targetTemplate) {
      throw new Error('One or both versions not found');
    }

    const contentDifferences = this.compareContent(
      sourceTemplate.template.content,
      targetTemplate.template.content
    );

    const metadataChanges = this.compareMetadata(
      sourceTemplate.template,
      targetTemplate.template
    );

    const variableChanges = this.compareVariables(
      sourceTemplate.template,
      targetTemplate.template
    );

    const performanceImpact = this.assessPerformanceImpact(
      sourceTemplate.versionMetadata.performance,
      targetTemplate.versionMetadata.performance
    );

    return {
      sourceVersion,
      targetVersion,
      contentDifferences,
      metadataChanges,
      variableChanges,
      performanceImpact,
      migrationRecommendations: this.generateMigrationRecommendations(
        contentDifferences,
        metadataChanges,
        variableChanges
      )
    };
  }

  /**
   * Get version by ID and version number
   */
  getVersion(templateId: string, version: string): VersionedTemplate | undefined {
    const versionedTemplate = this.versionedTemplates.get(templateId);
    if (!versionedTemplate) return undefined;

    if (versionedTemplate.versionMetadata.version === version) {
      return versionedTemplate;
    }

    // Check version history
    const historicalVersion = versionedTemplate.versionHistory.find(v => v.version === version);
    if (historicalVersion) {
      // Note: In a real implementation, you'd need to store and retrieve the full template data
      // This is a simplified version
      return {
        template: versionedTemplate.template, // This should be the historical template
        versionMetadata: historicalVersion,
        versionHistory: [],
        auditTrail: []
      };
    }

    return undefined;
  }

  /**
   * Get active version
   */
  getActiveVersion(templateId: string): VersionedTemplate | undefined {
    const activeVersion = this.activeVersions.get(templateId);
    if (!activeVersion) return undefined;

    return this.getVersion(templateId, activeVersion);
  }

  /**
   * Get version history
   */
  getVersionHistory(templateId: string): VersionMetadata[] {
    const versionedTemplate = this.versionedTemplates.get(templateId);
    if (!versionedTemplate) return [];

    return [versionedTemplate.versionMetadata, ...versionedTemplate.versionHistory]
      .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
  }

  /**
   * Get audit trail
   */
  getAuditTrail(templateId: string): AuditEntry[] {
    return this.auditTrail.get(templateId) || [];
  }

  /**
   * Approve version for publication
   */
  async approveVersion(
    templateId: string,
    version: string,
    user: string,
    comments: string[]
  ): Promise<void> {
    const versionedTemplate = this.versionedTemplates.get(templateId);
    if (!versionedTemplate || versionedTemplate.versionMetadata.version !== version) {
      throw new Error(`Version ${version} not found for template ${templateId}`);
    }

    versionedTemplate.versionMetadata.approval = {
      status: 'approved',
      approvedBy: user,
      approvalDate: new Date(),
      reviewerComments: comments,
      approvalCriteriaMet: true,
      qualityGatePassed: true
    };

    this.addAuditEntry(templateId, {
      id: this.generateAuditId(),
      timestamp: new Date(),
      action: 'updated',
      user,
      targetVersion: version,
      details: `Approved version ${version} for publication`,
      impact: 'medium'
    });
  }

  /**
   * Deprecate version
   */
  private async deprecateVersion(
    templateId: string,
    version: string,
    user: string,
    reason: string
  ): Promise<void> {
    const versionData = this.getVersionMetadata(templateId, version);
    if (versionData) {
      versionData.status = 'deprecated';
      versionData.deprecationDate = new Date();

      this.addAuditEntry(templateId, {
        id: this.generateAuditId(),
        timestamp: new Date(),
        action: 'deprecated',
        user,
        targetVersion: version,
        details: `Deprecated version ${version}: ${reason}`,
        impact: 'medium'
      });
    }
  }

  /**
   * Calculate next version number
   */
  private calculateNextVersion(templateId: string, changelog: ChangeLogEntry[]): string {
    const current = this.versionedTemplates.get(templateId);
    const currentVersion = current?.versionMetadata.version || '0.0.0';
    
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    // Determine version bump based on changelog
    const hasBreaking = changelog.some(c => c.impact === 'breaking');
    const hasMajor = changelog.some(c => c.impact === 'major');
    const hasMinor = changelog.some(c => c.impact === 'minor');
    
    if (hasBreaking) {
      return `${major + 1}.0.0`;
    } else if (hasMajor) {
      return `${major}.${minor + 1}.0`;
    } else if (hasMinor) {
      return `${major}.${minor}.${patch + 1}`;
    } else {
      return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Analyze compatibility between versions
   */
  private analyzeCompatibility(
    templateId: string,
    template: PromptTemplate,
    changelog: ChangeLogEntry[]
  ): CompatibilityInfo {
    const breakingChanges = changelog
      .filter(c => c.impact === 'breaking')
      .map(c => c.description);

    const backwardCompatible = breakingChanges.length === 0;
    
    return {
      backwardCompatible,
      forwardCompatible: false, // Generally not forward compatible
      compatibleVersions: backwardCompatible ? [template.version] : [],
      incompatibleVersions: !backwardCompatible ? [template.version] : [],
      breakingChanges,
      notes: breakingChanges.length > 0 ? 
        ['Breaking changes require migration'] : 
        ['Backward compatible upgrade']
    };
  }

  /**
   * Analyze migration requirements
   */
  private analyzeMigration(
    templateId: string,
    template: PromptTemplate,
    changelog: ChangeLogEntry[]
  ): MigrationInfo {
    const migrationRequired = changelog.some(c => c.impact === 'breaking' || c.impact === 'major');
    const hasVariableChanges = changelog.some(c => 
      c.affectedComponents.includes('variables') || 
      c.affectedComponents.includes('parameters')
    );
    
    return {
      migrationRequired,
      migrationType: migrationRequired ? 
        (hasVariableChanges ? 'manual' : 'assisted') : 
        'automatic',
      migrationScriptAvailable: !hasVariableChanges,
      migrationInstructions: this.generateMigrationInstructions(changelog),
      migrationWarnings: this.generateMigrationWarnings(changelog),
      estimatedMigrationTime: migrationRequired ? '15-30 minutes' : '< 5 minutes'
    };
  }

  /**
   * Generate migration instructions
   */
  private generateMigrationInstructions(changelog: ChangeLogEntry[]): string[] {
    const instructions: string[] = [];
    
    changelog.forEach(change => {
      if (change.migrationNotes) {
        instructions.push(change.migrationNotes);
      }
      
      if (change.impact === 'breaking') {
        instructions.push(`Update usage to handle: ${change.description}`);
      }
    });
    
    return instructions.length > 0 ? instructions : ['No manual migration required'];
  }

  /**
   * Generate migration warnings
   */
  private generateMigrationWarnings(changelog: ChangeLogEntry[]): string[] {
    const warnings: string[] = [];
    
    const breakingChanges = changelog.filter(c => c.impact === 'breaking');
    if (breakingChanges.length > 0) {
      warnings.push('This update contains breaking changes');
      warnings.push('Test thoroughly after migration');
    }
    
    const removedFeatures = changelog.filter(c => c.type === 'removed');
    if (removedFeatures.length > 0) {
      warnings.push('Some features have been removed');
    }
    
    return warnings;
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): VersionPerformanceMetrics {
    return {
      successRate: 0,
      averageQualityScore: 0,
      averageTokenUsage: 0,
      averageResponseTime: 0,
      usageCount: 0,
      errorRate: 0,
      userSatisfaction: 0
    };
  }

  /**
   * Calculate impact level from changelog
   */
  private calculateImpact(changelog: ChangeLogEntry[]): 'low' | 'medium' | 'high' | 'critical' {
    if (changelog.some(c => c.impact === 'breaking')) return 'critical';
    if (changelog.some(c => c.impact === 'major')) return 'high';
    if (changelog.some(c => c.impact === 'minor')) return 'medium';
    return 'low';
  }

  /**
   * Update version index
   */
  private updateVersionIndex(templateId: string, versionMetadata: VersionMetadata): void {
    if (!this.versionIndex.has(templateId)) {
      this.versionIndex.set(templateId, new Map());
    }
    
    this.versionIndex.get(templateId)!.set(versionMetadata.version, versionMetadata);
  }

  /**
   * Get version metadata
   */
  private getVersionMetadata(templateId: string, version: string): VersionMetadata | undefined {
    return this.versionIndex.get(templateId)?.get(version);
  }

  /**
   * Add audit entry
   */
  private addAuditEntry(templateId: string, entry: AuditEntry): void {
    if (!this.auditTrail.has(templateId)) {
      this.auditTrail.set(templateId, []);
    }
    
    this.auditTrail.get(templateId)!.push(entry);
  }

  /**
   * Generate audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle deployment strategy
   */
  private async handleDeploymentStrategy(
    templateId: string,
    version: string,
    config: DeploymentConfig,
    user: string
  ): Promise<void> {
    // Implementation would depend on the specific deployment strategy
    // For now, just log the deployment
    this.addAuditEntry(templateId, {
      id: this.generateAuditId(),
      timestamp: new Date(),
      action: 'updated',
      user,
      targetVersion: version,
      details: `Deployed using ${config.strategy} strategy`,
      impact: 'medium'
    });
  }

  /**
   * Compare content between versions
   */
  private compareContent(sourceContent: string, targetContent: string): ContentDifference[] {
    // Simple diff implementation - in production, use a proper diff library
    const differences: ContentDifference[] = [];
    
    if (sourceContent !== targetContent) {
      differences.push({
        type: 'modification',
        location: 'template_content',
        oldContent: sourceContent.substring(0, 100) + '...',
        newContent: targetContent.substring(0, 100) + '...',
        impact: 'Content has been modified'
      });
    }
    
    return differences;
  }

  /**
   * Compare metadata between versions
   */
  private compareMetadata(sourceTemplate: PromptTemplate, targetTemplate: PromptTemplate): MetadataChange[] {
    const changes: MetadataChange[] = [];
    
    if (sourceTemplate.recommendedTemperature !== targetTemplate.recommendedTemperature) {
      changes.push({
        field: 'recommendedTemperature',
        oldValue: sourceTemplate.recommendedTemperature,
        newValue: targetTemplate.recommendedTemperature,
        significance: 'minor'
      });
    }
    
    return changes;
  }

  /**
   * Compare variables between versions
   */
  private compareVariables(sourceTemplate: PromptTemplate, targetTemplate: PromptTemplate): VariableChange[] {
    const changes: VariableChange[] = [];
    
    // Check for added variables
    const addedRequired = targetTemplate.requiredVariables.filter(v => 
      !sourceTemplate.requiredVariables.includes(v)
    );
    addedRequired.forEach(variable => {
      changes.push({
        variableName: variable,
        changeType: 'added',
        newRequirement: 'required',
        migrationImpact: 'Breaking change - new required variable must be provided'
      });
    });
    
    return changes;
  }

  /**
   * Assess performance impact
   */
  private assessPerformanceImpact(
    sourceMetrics: VersionPerformanceMetrics,
    targetMetrics: VersionPerformanceMetrics
  ): PerformanceImpact {
    const tokenChange = targetMetrics.averageTokenUsage - sourceMetrics.averageTokenUsage;
    const qualityChange = targetMetrics.averageQualityScore - sourceMetrics.averageQualityScore;
    const responseTimeChange = targetMetrics.averageResponseTime - sourceMetrics.averageResponseTime;
    const successRateChange = targetMetrics.successRate - sourceMetrics.successRate;
    
    let overallImpact: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
    
    const positiveChanges = [qualityChange > 0, successRateChange > 0, responseTimeChange < 0].filter(Boolean).length;
    const negativeChanges = [qualityChange < 0, successRateChange < 0, responseTimeChange > 0, tokenChange > 0].filter(Boolean).length;
    
    if (positiveChanges > negativeChanges) overallImpact = 'positive';
    else if (negativeChanges > positiveChanges) overallImpact = 'negative';
    else if (positiveChanges > 0 && negativeChanges > 0) overallImpact = 'mixed';
    
    return {
      tokenUsageChange: tokenChange,
      qualityScoreChange: qualityChange,
      responseTimeChange: responseTimeChange,
      successRateChange: successRateChange,
      overallImpact,
      impactDescription: this.generateImpactDescription(overallImpact, {
        tokenChange,
        qualityChange,
        responseTimeChange,
        successRateChange
      })
    };
  }

  /**
   * Generate impact description
   */
  private generateImpactDescription(
    overallImpact: string,
    changes: { tokenChange: number; qualityChange: number; responseTimeChange: number; successRateChange: number }
  ): string {
    switch (overallImpact) {
      case 'positive':
        return 'Overall positive impact with improvements in key metrics';
      case 'negative':
        return 'Overall negative impact with degradation in key metrics';
      case 'mixed':
        return 'Mixed impact with both improvements and degradations';
      default:
        return 'Neutral impact with minimal changes to metrics';
    }
  }

  /**
   * Generate migration recommendations
   */
  private generateMigrationRecommendations(
    contentDifferences: ContentDifference[],
    metadataChanges: MetadataChange[],
    variableChanges: VariableChange[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (variableChanges.some(c => c.changeType === 'added' && c.newRequirement === 'required')) {
      recommendations.push('Update all template usages to include new required variables');
    }
    
    if (contentDifferences.length > 0) {
      recommendations.push('Review content changes and update any dependent workflows');
    }
    
    const breakingMetadataChanges = metadataChanges.filter(c => c.significance === 'breaking');
    if (breakingMetadataChanges.length > 0) {
      recommendations.push('Review breaking metadata changes and update integration code');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('No specific migration actions required');
    }
    
    return recommendations;
  }

  /**
   * Initialize versioning system
   */
  private initializeVersioningSystem(): void {
    // Initialization logic for the versioning system
    console.log('Template Versioning System initialized');
  }
}

/**
 * Create singleton instance of template versioning system
 */
export const templateVersioningSystem = new TemplateVersioningSystem();