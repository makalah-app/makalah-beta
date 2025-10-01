# 🔐 SECRETS MANAGEMENT SYSTEM

Comprehensive guide to managing API keys and sensitive configuration in Makalah AI platform.

## 📋 Overview

The Makalah AI platform implements a multi-layered secrets management system with:

- **Encrypted Storage**: AES-256-GCM encryption for all sensitive data
- **Key Rotation**: Automated and manual API key rotation
- **Environment Isolation**: Separate secrets per environment
- **Audit Trail**: Complete logging of all secret operations
- **Backup & Recovery**: Rollback capabilities for failed rotations

## 🏗️ Architecture

### Core Components

1. **SecretsManager**: Handles encryption, storage, and retrieval
2. **ApiKeyRotationManager**: Manages key lifecycle and rotation
3. **Environment Validation**: Ensures proper configuration
4. **Database Schema**: Secure storage with RLS policies
5. **CLI Tools**: Command-line interface for operations

### Security Features

- **AES-256-GCM Encryption**: Military-grade encryption for stored secrets
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Authenticated Encryption**: Integrity protection with auth tags
- **Row Level Security**: Database-level access control
- **Environment Isolation**: Secrets segregated by environment

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Generate master encryption key
npm run secrets generate --type master-key

# Set environment variable
export SECRETS_MASTER_KEY=your_generated_key_here

# Run database migrations
npx supabase db push
```

### 2. Store Your First API Key

```bash
# Interactive prompt (secure)
npm run secrets store --provider openai --env development

# Or with key directly (less secure)
npm run secrets store --provider openai --env development --key sk-proj-your-key-here
```

### 3. Verify Setup

```bash
# Check health
npm run secrets health

# Validate environment
npm run secrets validate

# List stored secrets
npm run secrets list
```

## 🛠️ CLI Reference

### Basic Commands

```bash
# Store a secret
npm run secrets store -p openai -e development -k your-key

# Retrieve a secret (masked)
npm run secrets get -p openai -e development

# Retrieve a secret (full - be careful!)
npm run secrets get -p openai -e development --show

# List all secrets
npm run secrets list -e development

# Delete a secret
npm run secrets delete -p openai -e development
```

### Rotation Commands

```bash
# Rotate API key with new key
npm run secrets rotate -p openai -e production -k new-key

# Check rotation status
npm run secrets check -e production

# Rollback to previous key
npm run secrets rollback -p openai -e production

# View rotation history
npm run secrets history -p openai -e production
```

### Utility Commands

```bash
# Generate secure secrets
npm run secrets generate --type master-key
npm run secrets generate --type jwt-secret --length 64
npm run secrets generate --type nextauth-secret --length 32

# Health check
npm run secrets health

# Environment validation
npm run secrets validate
```

## 🔄 API Key Rotation

### Automatic Rotation Schedule

| Provider | Rotation Interval | Warning Period |
|----------|------------------|----------------|
| OpenAI | 90 days | 30 days |
| OpenRouter | 60 days | 15 days |
| GitHub | 365 days | 60 days |

### Manual Rotation Process

1. **Generate new key** at provider dashboard
2. **Test new key** with test endpoint
3. **Rotate using CLI**:
   ```bash
   npm run secrets rotate -p openai -e production -k new-key
   ```
4. **Verify application works** with new key
5. **Monitor for issues** and rollback if needed

### Rollback Procedure

If rotation fails or causes issues:

```bash
# Rollback to previous key
npm run secrets rollback -p openai -e production

# Verify rollback worked
npm run secrets get -p openai -e production

# Check application health
npm run secrets health
```

## 🌍 Environment Configuration

### Development

```bash
# Relaxed settings for development
NODE_ENV=development
API_KEY_ROTATION_WARNING_DAYS=365
API_KEY_ROTATION_REQUIRED_DAYS=365
ENABLE_DEBUG_MODE=true
```

### Staging

```bash
# Production-like but separate keys
NODE_ENV=staging
API_KEY_ROTATION_WARNING_DAYS=45
API_KEY_ROTATION_REQUIRED_DAYS=90
ENABLE_DEBUG_MODE=false
```

### Production

```bash
# Strict settings for production
NODE_ENV=production
API_KEY_ROTATION_WARNING_DAYS=30
API_KEY_ROTATION_REQUIRED_DAYS=90
ENABLE_DEBUG_MODE=false
FORCE_HTTPS=true
```

## 🔐 Security Best Practices

### Key Management

1. **Never commit secrets** to version control
2. **Use strong master keys** (64+ hex characters)
3. **Rotate keys regularly** according to schedule
4. **Test keys before rotation**
5. **Keep backups for rollback**

### Access Control

1. **Limit admin access** to production secrets
2. **Use environment isolation**
3. **Audit all operations**
4. **Monitor for anomalies**
5. **Implement least privilege**

### Operational Security

1. **Run health checks** regularly
2. **Monitor rotation schedules**
3. **Set up alerting** for critical keys
4. **Document procedures**
5. **Test disaster recovery**

## 🚨 Emergency Procedures

### Compromised API Key

1. **Immediately rotate** the compromised key:
   ```bash
   npm run secrets rotate -p provider -e production -k new-emergency-key
   ```

2. **Check audit logs** for unauthorized access:
   ```bash
   npm run secrets history -p provider -e production
   ```

3. **Review application logs** for anomalous activity

4. **Notify relevant parties** (team, provider)

### Lost Master Key

1. **Stop all operations** immediately
2. **Generate new master key**:
   ```bash
   npm run secrets generate --type master-key
   ```
3. **Re-encrypt all secrets** with new master key
4. **Update environment variables**
5. **Verify all systems** work with new encryption

### Database Compromise

1. **Revoke all database access**
2. **Rotate all API keys** stored in database
3. **Generate new master key**
4. **Rebuild secrets database** from scratch
5. **Implement additional monitoring**

## 📊 Monitoring & Alerting

### Key Metrics

- **Rotation compliance**: Percentage of keys rotated on schedule
- **Failed rotations**: Number of failed rotation attempts
- **Critical keys**: Keys requiring immediate rotation
- **Audit violations**: Unauthorized access attempts

### Alert Thresholds

- **Critical**: Key expired (0 days remaining)
- **Warning**: Key expires soon (< warning period)
- **Info**: Successful rotation completed

### Dashboard Queries

```sql
-- Keys requiring rotation
SELECT provider, environment,
       DATE_PART('day', expires_at - NOW()) as days_remaining
FROM encrypted_secrets
WHERE is_active = true
  AND expires_at < NOW() + INTERVAL '30 days';

-- Recent rotations
SELECT provider, environment, success, message, timestamp
FROM api_key_rotations
ORDER BY timestamp DESC
LIMIT 10;

-- Audit summary
SELECT operation, COUNT(*) as count
FROM secret_audit_log
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY operation;
```

## 🧪 Testing

### Unit Tests

```bash
# Test secrets manager
npm run test src/lib/security/secrets-manager.test.ts

# Test rotation manager
npm run test src/lib/security/api-key-rotation.test.ts

# Test environment validation
npm run test src/lib/config/env-validation.test.ts
```

### Integration Tests

```bash
# Test full encryption cycle
npm run test:integration secrets-encryption

# Test rotation workflow
npm run test:integration key-rotation

# Test database operations
npm run test:integration secrets-database
```

### Manual Testing

```bash
# Test with development keys
npm run secrets store -p test -e development -k test-key-123
npm run secrets get -p test -e development
npm run secrets rotate -p test -e development -k new-test-key-456
npm run secrets rollback -p test -e development
npm run secrets delete -p test -e development
```

## 📚 API Reference

### SecretsManager

```typescript
// Store a secret
const secretId = await secretsManager.storeSecret(
  'api_key_name',
  'secret_value',
  'provider_name',
  {
    environment: 'production',
    expiresInDays: 90,
    replaceExisting: true
  }
);

// Retrieve a secret
const secret = await secretsManager.getSecret(
  'api_key_name',
  'provider_name',
  'production'
);

// Rotate a secret
const newSecretId = await secretsManager.rotateSecret(
  'api_key_name',
  'provider_name',
  'new_secret_value',
  'production'
);
```

### ApiKeyRotationManager

```typescript
// Check rotation status
const statuses = await rotationManager.checkRotationStatus('production');

// Rotate key with validation
const result = await rotationManager.rotateApiKey(
  'openai',
  'new_api_key',
  'production',
  {
    testKey: true,
    notifyUsers: true,
    keepBackup: true
  }
);

// Rollback key
const rollbackResult = await rotationManager.rollbackApiKey(
  'openai',
  'production'
);
```

## 🔧 Troubleshooting

### Common Issues

**Issue**: `Secret decryption failed - possible tampering detected`
- **Cause**: Wrong master key or corrupted data
- **Solution**: Verify SECRETS_MASTER_KEY environment variable

**Issue**: `No backup key available for rollback`
- **Cause**: Rotation without backup enabled
- **Solution**: Manually set new key and enable backups

**Issue**: `API key test failed for provider`
- **Cause**: Invalid key or network issue
- **Solution**: Verify key at provider dashboard, check network

### Diagnostic Commands

```bash
# Check system health
npm run secrets health

# Validate configuration
npm run secrets validate

# View recent operations
npm run secrets history -e production --limit 20

# Test encryption/decryption
npm run secrets test-encryption
```

### Recovery Procedures

```bash
# Backup current secrets (before major changes)
npm run secrets export -e production > secrets-backup.json

# Restore from backup (emergency only)
npm run secrets import -e production < secrets-backup.json

# Reset specific provider
npm run secrets reset -p openai -e production
```

## 📞 Support

For issues with secrets management:

1. **Check this documentation** first
2. **Run diagnostic commands** to identify issue
3. **Check audit logs** for clues
4. **Contact platform administrators** for production issues
5. **Create issue** in repository for bugs

---

**⚠️ Security Notice**: This documentation contains sensitive security information. Ensure proper access controls and never share master keys or detailed procedures with unauthorized personnel.
