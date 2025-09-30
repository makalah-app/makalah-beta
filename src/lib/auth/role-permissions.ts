/**
 * Role-Based Permission System
 * 
 * Manages role-based access control for Makalah AI platform with
 * granular permissions for academic workflows and admin functions.
 * 
 * Features:
 * - Role hierarchy (admin > researcher > student)
 * - Academic workflow permissions (7-phase system)
 * - Resource-based access control
 * - Dynamic permission checking
 * - Admin privilege management
 * - Session-based permission caching
 */

// Permission Types
export type UserRole = 'admin' | 'researcher' | 'student' | 'guest';

export type Permission = 
  // Academic Workflow Permissions
  | 'workflow.create'
  | 'workflow.read'
  | 'workflow.update' 
  | 'workflow.delete'
  | 'workflow.approve'
  | 'workflow.reject'
  | 'workflow.export'
  
  // Phase-Specific Permissions
  | 'phase.topic_selection'
  | 'phase.literature_review'
  | 'phase.research_methodology'
  | 'phase.data_collection'
  | 'phase.analysis'
  | 'phase.writing'
  | 'phase.review'
  
  // Resource Permissions
  | 'resources.upload'
  | 'resources.download'
  | 'resources.share'
  | 'resources.manage'
  
  // AI & Tools Permissions
  | 'ai.chat'
  | 'ai.search'
  | 'ai.analysis'
  | 'ai.generation'
  | 'tools.academic_tools'
  | 'tools.citation_tools'
  | 'tools.analysis_tools'
  
  // Admin Permissions
  | 'admin.users'
  | 'admin.system'
  | 'admin.analytics'
  | 'admin.settings'
  | 'admin.content'
  
  // System Permissions
  | 'system.read'
  | 'system.write'
  | 'system.delete'
  | 'system.configure';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  limitations: Record<string, any>;
  metadata: {
    description: string;
    level: number;
    inheritsFrom?: UserRole[];
  };
}

export interface UserPermissionContext {
  userId: string;
  role: UserRole;
  institution?: string;
  isVerified: boolean;
  sessionData?: {
    loginTime: number;
    lastActivity: number;
    sessionId: string;
  };
  resourceAccess?: {
    ownedResources: string[];
    sharedResources: string[];
    collaborativeAccess: string[];
  };
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  limitations?: Record<string, any>;
  suggestedUpgrade?: UserRole;
}

// Role Definitions with Hierarchical Permissions
const ROLE_DEFINITIONS: Record<UserRole, RolePermissions> = {
  admin: {
    role: 'admin',
    permissions: [
      // Full access to everything
      'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
      'workflow.approve', 'workflow.reject', 'workflow.export',
      
      // All phases
      'phase.topic_selection', 'phase.literature_review', 'phase.research_methodology',
      'phase.data_collection', 'phase.analysis', 'phase.writing', 'phase.review',
      
      // All resources
      'resources.upload', 'resources.download', 'resources.share', 'resources.manage',
      
      // All AI & tools
      'ai.chat', 'ai.search', 'ai.analysis', 'ai.generation',
      'tools.academic_tools', 'tools.citation_tools', 'tools.analysis_tools',
      
      // Admin exclusive
      'admin.users', 'admin.system', 'admin.analytics', 'admin.settings', 'admin.content',
      
      // System level
      'system.read', 'system.write', 'system.delete', 'system.configure'
    ],
    limitations: {},
    metadata: {
      description: 'Administrator dengan akses penuh ke seluruh sistem',
      level: 4,
      inheritsFrom: []
    }
  },
  
  researcher: {
    role: 'researcher',
    permissions: [
      // Workflow permissions (full academic workflow)
      'workflow.create', 'workflow.read', 'workflow.update', 'workflow.export',
      
      // All academic phases
      'phase.topic_selection', 'phase.literature_review', 'phase.research_methodology',
      'phase.data_collection', 'phase.analysis', 'phase.writing', 'phase.review',
      
      // Resource management
      'resources.upload', 'resources.download', 'resources.share',
      
      // AI & tools access
      'ai.chat', 'ai.search', 'ai.analysis', 'ai.generation',
      'tools.academic_tools', 'tools.citation_tools', 'tools.analysis_tools',
      
      // Basic system access
      'system.read', 'system.write'
    ],
    limitations: {
      maxWorkflows: 10,
      maxFileUpload: 100, // MB
      aiRequestsPerDay: 1000,
      collaboratorsLimit: 5
    },
    metadata: {
      description: 'Peneliti dengan akses penuh workflow akademik',
      level: 3,
      inheritsFrom: ['student']
    }
  },
  
  student: {
    role: 'student',
    permissions: [
      // Basic workflow permissions
      'workflow.create', 'workflow.read', 'workflow.update',
      
      // Phase permissions (supervised)
      'phase.topic_selection', 'phase.literature_review', 'phase.research_methodology',
      'phase.data_collection', 'phase.analysis', 'phase.writing',
      
      // Limited resource access
      'resources.upload', 'resources.download',
      
      // AI access (limited)
      'ai.chat', 'ai.search', 'ai.analysis',
      'tools.academic_tools', 'tools.citation_tools',
      
      // Read-only system access
      'system.read'
    ],
    limitations: {
      maxWorkflows: 3,
      maxFileUpload: 25, // MB
      aiRequestsPerDay: 200,
      requiresApproval: ['phase.review', 'workflow.export'],
      supervisorRequired: true
    },
    metadata: {
      description: 'Mahasiswa dengan akses terbatas dan supervised',
      level: 2,
      inheritsFrom: ['guest']
    }
  },
  
  guest: {
    role: 'guest',
    permissions: [
      // Very limited access
      'workflow.read',
      'resources.download',
      'ai.chat',
      'tools.academic_tools',
      'system.read'
    ],
    limitations: {
      maxWorkflows: 0,
      maxFileUpload: 0,
      aiRequestsPerDay: 10,
      readOnly: true,
      sessionTimeout: 3600 // 1 hour
    },
    metadata: {
      description: 'Tamu dengan akses terbatas read-only',
      level: 1,
      inheritsFrom: []
    }
  }
};

/**
 * Permission Management Class
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private permissionCache: Map<string, { permissions: Permission[], timestamp: number }>;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.permissionCache = new Map();
  }

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Get role permissions
   */
  getRolePermissions(role: UserRole): RolePermissions {
    return ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.guest;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(
    context: UserPermissionContext,
    permission: Permission,
    resourceId?: string
  ): PermissionCheckResult {
    try {
      const rolePerms = this.getRolePermissions(context.role);
      
      // Check if permission exists in role
      if (!rolePerms.permissions.includes(permission)) {
        return {
          granted: false,
          reason: `Role '${context.role}' tidak memiliki permission '${permission}'`,
          suggestedUpgrade: this.suggestUpgrade(context.role, permission)
        };
      }

      // Check role-specific limitations
      const limitationCheck = this.checkLimitations(context, rolePerms.limitations, permission);
      if (!limitationCheck.granted) {
        return limitationCheck;
      }

      // Check resource-specific access
      if (resourceId && !this.hasResourceAccess(context, resourceId, permission)) {
        return {
          granted: false,
          reason: 'Akses ke resource ini tidak diizinkan'
        };
      }

      // Check session validity
      const sessionCheck = this.validateSession(context);
      if (!sessionCheck.granted) {
        return sessionCheck;
      }

      return {
        granted: true,
        limitations: rolePerms.limitations
      };

    } catch (error) {
      return {
        granted: false,
        reason: 'Error dalam validasi permission'
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  hasPermissions(
    context: UserPermissionContext,
    permissions: Permission[],
    resourceId?: string
  ): Record<Permission, PermissionCheckResult> {
    const results: Record<Permission, PermissionCheckResult> = {} as Record<Permission, PermissionCheckResult>;
    
    for (const permission of permissions) {
      results[permission] = this.hasPermission(context, permission, resourceId);
    }
    
    return results;
  }

  /**
   * Get all permissions for user
   */
  getUserPermissions(context: UserPermissionContext): Permission[] {
    const cacheKey = `${context.userId}_${context.role}`;
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.permissions;
    }

    const rolePerms = this.getRolePermissions(context.role);
    let permissions = [...rolePerms.permissions];

    // Apply inheritance
    if (rolePerms.metadata.inheritsFrom) {
      for (const inheritRole of rolePerms.metadata.inheritsFrom) {
        const inheritPerms = this.getRolePermissions(inheritRole);
        permissions = [...new Set([...permissions, ...inheritPerms.permissions])];
      }
    }

    // Cache the result
    this.permissionCache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    });

    return permissions;
  }

  /**
   * Check if user can access admin features
   */
  isAdmin(context: UserPermissionContext): boolean {
    return context.role === 'admin' && this.hasPermission(context, 'admin.system').granted;
  }

  /**
   * Check if user can perform academic operations
   */
  canPerformAcademicOperations(context: UserPermissionContext): boolean {
    const academicPermissions: Permission[] = [
      'workflow.create',
      'phase.topic_selection',
      'ai.analysis',
      'tools.academic_tools'
    ];

    return academicPermissions.every(
      perm => this.hasPermission(context, perm).granted
    );
  }

  /**
   * Get permission level comparison
   */
  compareRoles(role1: UserRole, role2: UserRole): number {
    const level1 = ROLE_DEFINITIONS[role1]?.metadata.level || 0;
    const level2 = ROLE_DEFINITIONS[role2]?.metadata.level || 0;
    return level1 - level2;
  }

  /**
   * Get role upgrade suggestions
   */
  suggestUpgrade(currentRole: UserRole, desiredPermission: Permission): UserRole | undefined {
    const roles: UserRole[] = ['student', 'researcher', 'admin'];
    
    for (const role of roles) {
      if (this.compareRoles(role, currentRole) > 0) {
        const rolePerms = this.getRolePermissions(role);
        if (rolePerms.permissions.includes(desiredPermission)) {
          return role;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Create permission context from user data
   */
  createPermissionContext(userData: {
    id: string;
    role: UserRole;
    email?: string;
    institution?: string;
    isVerified?: boolean;
    sessionId?: string;
  }): UserPermissionContext {
    return {
      userId: userData.id,
      role: userData.role,
      institution: userData.institution,
      isVerified: userData.isVerified || false,
      sessionData: userData.sessionId ? {
        sessionId: userData.sessionId,
        loginTime: Date.now(),
        lastActivity: Date.now()
      } : undefined
    };
  }

  // Private helper methods

  private checkLimitations(
    context: UserPermissionContext,
    limitations: Record<string, any>,
    permission: Permission
  ): PermissionCheckResult {
    // Check verification requirement
    if (limitations.requiresVerification && !context.isVerified) {
      return {
        granted: false,
        reason: 'Akun harus diverifikasi untuk menggunakan fitur ini'
      };
    }

    // Check approval requirements
    if (limitations.requiresApproval && limitations.requiresApproval.includes(permission)) {
      return {
        granted: false,
        reason: 'Permission ini memerlukan persetujuan supervisor'
      };
    }

    // Check read-only mode
    if (limitations.readOnly && ['create', 'update', 'delete'].some(action => permission.includes(action))) {
      return {
        granted: false,
        reason: 'Akun dalam mode read-only'
      };
    }

    return { granted: true };
  }

  private hasResourceAccess(
    context: UserPermissionContext,
    resourceId: string,
    permission: Permission
  ): boolean {
    if (!context.resourceAccess) {
      return false;
    }

    const { ownedResources, sharedResources, collaborativeAccess } = context.resourceAccess;

    // Owner has full access
    if (ownedResources.includes(resourceId)) {
      return true;
    }

    // Shared resource access depends on permission
    if (sharedResources.includes(resourceId)) {
      return !permission.includes('delete') && !permission.includes('manage');
    }

    // Collaborative access for approved resources
    if (collaborativeAccess.includes(resourceId)) {
      return ['read', 'update'].some(action => permission.includes(action));
    }

    return false;
  }

  private validateSession(context: UserPermissionContext): PermissionCheckResult {
    if (!context.sessionData) {
      return { granted: true }; // No session validation needed
    }

    const { loginTime, lastActivity } = context.sessionData;
    const now = Date.now();

    // Check session timeout based on role
    const rolePerms = this.getRolePermissions(context.role);
    const sessionTimeout = rolePerms.limitations.sessionTimeout || 24 * 60 * 60 * 1000; // 24 hours default

    if (now - lastActivity > sessionTimeout) {
      return {
        granted: false,
        reason: 'Session expired, silakan login kembali'
      };
    }

    return { granted: true };
  }

  /**
   * Clear permission cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      // Clear specific user cache
      for (const key of this.permissionCache.keys()) {
        if (key.startsWith(userId)) {
          this.permissionCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.permissionCache.clear();
    }
  }
}

/**
 * Permission Hook Utilities (for React components)
 */
export function createPermissionHook(context: UserPermissionContext) {
  const manager = PermissionManager.getInstance();
  
  return {
    hasPermission: (permission: Permission, resourceId?: string) =>
      manager.hasPermission(context, permission, resourceId),
    
    hasAnyPermission: (permissions: Permission[], resourceId?: string) =>
      permissions.some(perm => manager.hasPermission(context, perm, resourceId).granted),
    
    hasAllPermissions: (permissions: Permission[], resourceId?: string) =>
      permissions.every(perm => manager.hasPermission(context, perm, resourceId).granted),
    
    isAdmin: () => manager.isAdmin(context),
    
    canPerformAcademicOperations: () => manager.canPerformAcademicOperations(context),
    
    getUserPermissions: () => manager.getUserPermissions(context),
    
    getRoleInfo: () => manager.getRolePermissions(context.role)
  };
}

/**
 * Default Export
 */
const rolePermissions = {
  PermissionManager,
  createPermissionHook,
  ROLE_DEFINITIONS
};

export default rolePermissions;