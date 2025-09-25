# 🛡️ SECURITY SETUP GUIDE

Complete guide for setting up environment secrets management for Makalah AI platform.

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install  # Dependencies already added
```

### 2. Generate Master Key
```bash
npm run secrets:generate --type master-key
# Copy the generated key - you'll need it!
```

### 3. Create .env.local
```bash
cp .env.example .env.local
# Edit .env.local with your actual keys
```

### 4. Set Master Key
Add to your `.env.local`:
```bash
SECRETS_MASTER_KEY=your_generated_64_char_hex_key_here
```

### 5. Test Setup
```bash
npm run secrets:health
npm run secrets:validate
```

## 🔐 Store Your First API Keys

### OpenAI
```bash
npm run secrets:store --provider openai --env development
# Enter your OpenAI key when prompted
```

### OpenRouter
```bash
npm run secrets:store --provider openrouter --env development
# Enter your OpenRouter key when prompted
```

### Perplexity (Optional)
```bash
npm run secrets:store --provider perplexity --env development
# Enter your Perplexity key when prompted
```

### Verify Storage
```bash
npm run secrets:list --env development
```

## 🌍 Environment Management

### Development
- Use weak/test keys
- Relaxed security settings
- Debug mode enabled

### Production
- Strong secrets (64+ chars)
- Strict security settings
- Minimal logging
- HTTPS enforced

### Key Commands by Environment

```bash
# Development
npm run secrets:store --provider openai --env development
npm run secrets:check --env development

# Production
npm run secrets:store --provider openai --env production
npm run secrets:check --env production
```

## 🔄 API Key Rotation

### Check Status
```bash
npm run secrets:check --env production
```

### Rotate Key
```bash
npm run secrets:rotate --provider openai --env production
# Enter new key when prompted
```

### Rollback (Emergency)
```bash
npm run secrets:rollback --provider openai --env production
```

## 📊 Monitoring

### Daily Health Check
```bash
npm run secrets:health && npm run secrets:validate
```

### Weekly Rotation Check
```bash
npm run secrets:check --env production
```

### Monthly Key Rotation
```bash
# Generate new keys at providers, then:
npm run secrets:rotate --provider openai --env production
npm run secrets:rotate --provider openrouter --env production
```

## 🚨 Emergency Procedures

### Compromised Key
1. **Immediate rotation**:
   ```bash
   npm run secrets:rotate --provider openai --env production --new-key NEW_EMERGENCY_KEY
   ```

2. **Check audit logs** in database
3. **Monitor application** for issues
4. **Notify team** of incident

### System Recovery
```bash
# Generate new master key
npm run secrets:generate --type master-key

# Re-encrypt all secrets (contact admin)
npm run secrets:migrate --new-master-key NEW_KEY

# Verify system
npm run secrets:health
```

## ✅ Security Checklist

### Initial Setup
- [ ] Generated strong master key (64+ hex chars)
- [ ] Set SECRETS_MASTER_KEY environment variable
- [ ] Stored all required API keys
- [ ] Tested health check passes
- [ ] Environment validation passes
- [ ] Database migrations applied

### Production Deployment
- [ ] All API keys stored in production environment
- [ ] Master key set via secure environment variable
- [ ] Database RLS policies active
- [ ] Monitoring/alerting configured
- [ ] Backup procedures documented
- [ ] Team trained on procedures

### Regular Maintenance
- [ ] Weekly rotation status checks
- [ ] Monthly key rotations
- [ ] Quarterly security reviews
- [ ] Annual disaster recovery tests
- [ ] Audit log reviews
- [ ] Documentation updates

## 🛠️ Development Workflow

### New Developer Onboarding
1. **Setup development environment**:
   ```bash
   cp .env.example .env.local
   npm run secrets:generate --type master-key
   # Add generated key to .env.local
   ```

2. **Get development keys** from team lead
3. **Store keys locally**:
   ```bash
   npm run secrets:store --provider openai --env development
   ```

4. **Verify setup**:
   ```bash
   npm run secrets:validate
   npm run dev  # Should work without errors
   ```

### Adding New API Provider
1. **Add provider config** in `api-key-rotation.ts`
2. **Update validation schema** in `env-validation.ts`
3. **Add CLI support** in `secrets-cli.ts`
4. **Document** in SECRETS_MANAGEMENT.md
5. **Test** with development keys

### Environment Migration
```bash
# Export from staging
npm run secrets:export --env staging > staging-secrets.json

# Import to production (admin only)
npm run secrets:import --env production < staging-secrets.json

# Verify migration
npm run secrets:check --env production
```

## 🔍 Troubleshooting

### Common Issues

**"crypto is not defined"**
- Check SECRETS_MASTER_KEY is set
- Verify Node.js version >= 18

**"Secret decryption failed"**
- Wrong master key
- Corrupted data
- Check environment variables

**"API key test failed"**
- Invalid key format
- Network connectivity
- Provider API issues

### Debug Commands

```bash
# System health
npm run secrets:health

# Environment validation
npm run secrets:validate

# List all secrets (safe)
npm run secrets:list --env development

# View specific key (masked)
npm run secrets:get --provider openai --env development
```

## 📚 Additional Resources

- [Secrets Management Documentation](./docs/security/SECRETS_MANAGEMENT.md)
- [Environment Configuration Guide](./.env.example)
- [Database Schema](./supabase/migrations/20250925_encrypted_secrets.sql)
- [CLI Reference](./scripts/secrets-cli.ts)

## 🔒 Security Notes

- **Never commit** `.env.local` to version control
- **Use strong master keys** (64+ hex characters)
- **Rotate keys regularly** according to schedule
- **Monitor access logs** for anomalies
- **Test backup procedures** regularly
- **Keep documentation updated**

---

**🛡️ Security is everyone's responsibility! Follow these procedures and keep our secrets safe.**