#!/usr/bin/env tsx
/**
 * SECRETS MANAGEMENT CLI TOOL
 *
 * Command-line interface for managing encrypted secrets
 * Usage: npx tsx scripts/secrets-cli.ts [command] [options]
 */

import { program } from 'commander';
import { getSecretsManager, storeApiKey, getApiKey, rotateApiKey } from '../src/lib/security/secrets-manager';
import { getRotationManager, checkAllRotations } from '../src/lib/security/api-key-rotation';
import { validateEnvironment } from '../src/lib/config/env-validation';
import crypto from 'crypto';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`${colors.bold}${colors.blue}🔐 ${msg}${colors.reset}`),
};

// Helper to prompt for sensitive input
function promptSecret(message: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(`${message}: `);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let input = '';
    process.stdin.on('data', (char) => {
      char = char.toString();

      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        console.log(); // New line
        resolve(input);
      } else if (char === '\u0003') { // Ctrl+C
        process.exit();
      } else if (char === '\u007f') { // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += char;
        process.stdout.write('*');
      }
    });
  });
}

// Command: store - Store a new secret
program
  .command('store')
  .description('Store a new API key or secret')
  .requiredOption('-p, --provider <provider>', 'Provider name (openai, openrouter, perplexity, github)')
  .option('-e, --env <environment>', 'Environment (development, staging, production)', 'development')
  .option('-k, --key <key>', 'API key (will prompt if not provided)')
  .option('--expires <days>', 'Expires in N days')
  .option('--replace', 'Replace existing secret')
  .action(async (options) => {
    try {
      log.header(`Storing API key for ${options.provider}`);

      let apiKey = options.key;
      if (!apiKey) {
        apiKey = await promptSecret(`Enter ${options.provider} API key`);
      }

      if (!apiKey) {
        log.error('API key is required');
        process.exit(1);
      }

      const secretId = await storeApiKey(
        options.provider,
        apiKey,
        options.env
      );

      log.success(`API key stored successfully for ${options.provider} in ${options.env}`);
      log.info(`Secret ID: ${secretId}`);

    } catch (error) {
      log.error(`Failed to store secret: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: get - Retrieve a secret
program
  .command('get')
  .description('Retrieve an API key (displays securely)')
  .requiredOption('-p, --provider <provider>', 'Provider name')
  .option('-e, --env <environment>', 'Environment', 'development')
  .option('--show', 'Show full key (security risk!)')
  .action(async (options) => {
    try {
      log.header(`Retrieving API key for ${options.provider}`);

      const apiKey = await getApiKey(options.provider, options.env);

      if (!apiKey) {
        log.warning(`No API key found for ${options.provider} in ${options.env}`);
        return;
      }

      if (options.show) {
        log.warning('Displaying full API key - ensure terminal is secure!');
        console.log(`API Key: ${apiKey}`);
      } else {
        const masked = apiKey.substring(0, 8) + '*'.repeat(Math.max(0, apiKey.length - 12)) + apiKey.substring(apiKey.length - 4);
        log.info(`API Key: ${masked}`);
      }

      log.success(`API key retrieved successfully`);

    } catch (error) {
      log.error(`Failed to retrieve secret: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: rotate - Rotate an API key
program
  .command('rotate')
  .description('Rotate an API key')
  .requiredOption('-p, --provider <provider>', 'Provider name')
  .option('-e, --env <environment>', 'Environment', 'development')
  .option('-k, --new-key <key>', 'New API key (will prompt if not provided)')
  .option('--no-test', 'Skip key validation test')
  .option('--no-backup', 'Don\'t keep backup of old key')
  .action(async (options) => {
    try {
      log.header(`Rotating API key for ${options.provider}`);

      let newKey = options.newKey;
      if (!newKey) {
        newKey = await promptSecret(`Enter new ${options.provider} API key`);
      }

      if (!newKey) {
        log.error('New API key is required');
        process.exit(1);
      }

      const manager = getRotationManager();
      const result = await manager.rotateApiKey(
        options.provider,
        newKey,
        options.env,
        {
          testKey: options.test !== false,
          keepBackup: options.backup !== false
        }
      );

      if (result.success) {
        log.success(result.message);
        if (result.rollbackAvailable) {
          log.info('Backup available for rollback if needed');
        }
      } else {
        log.error(result.message);
        process.exit(1);
      }

    } catch (error) {
      log.error(`Failed to rotate key: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: rollback - Rollback to previous key
program
  .command('rollback')
  .description('Rollback to previous API key')
  .requiredOption('-p, --provider <provider>', 'Provider name')
  .option('-e, --env <environment>', 'Environment', 'development')
  .action(async (options) => {
    try {
      log.header(`Rolling back API key for ${options.provider}`);

      const manager = getRotationManager();
      const result = await manager.rollbackApiKey(options.provider, options.env);

      if (result.success) {
        log.success(result.message);
      } else {
        log.error(result.message);
        process.exit(1);
      }

    } catch (error) {
      log.error(`Failed to rollback key: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: list - List all stored secrets
program
  .command('list')
  .description('List all stored secrets (metadata only)')
  .option('-e, --env <environment>', 'Environment', 'development')
  .action(async (options) => {
    try {
      log.header(`Listing secrets in ${options.env}`);

      const manager = getSecretsManager();
      const secrets = await manager.listSecrets(options.env);

      if (secrets.length === 0) {
        log.warning(`No secrets found in ${options.env}`);
        return;
      }

      console.table(secrets.map(secret => ({
        Name: secret.name,
        Provider: secret.provider,
        Environment: secret.environment,
        Created: secret.created_at.toISOString().split('T')[0],
        'Last Rotated': secret.last_rotated ? secret.last_rotated.toISOString().split('T')[0] : 'Never',
        Version: secret.version,
        Active: secret.is_active ? '✅' : '❌'
      })));

    } catch (error) {
      log.error(`Failed to list secrets: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: check - Check rotation status
program
  .command('check')
  .description('Check API key rotation status')
  .option('-e, --env <environment>', 'Environment', 'production')
  .action(async (options) => {
    try {
      log.header(`Checking rotation status in ${options.env}`);

      const warnings = await checkAllRotations();

      // Display critical keys
      if (warnings.critical.length > 0) {
        log.error(`${warnings.critical.length} API keys need immediate rotation:`);
        console.table(warnings.critical.map(status => ({
          Provider: status.provider,
          Status: '🚨 CRITICAL',
          'Days Overdue': Math.abs(status.daysUntilRotation),
          'Last Rotated': status.lastRotated?.toISOString().split('T')[0] || 'Never'
        })));
      }

      // Display warning keys
      if (warnings.warnings.length > 0) {
        log.warning(`${warnings.warnings.length} API keys approaching rotation:`);
        console.table(warnings.warnings.map(status => ({
          Provider: status.provider,
          Status: '⚠️  WARNING',
          'Days Until Rotation': status.daysUntilRotation,
          'Next Rotation': status.nextRotation.toISOString().split('T')[0]
        })));
      }

      // Display healthy keys
      if (warnings.healthy.length > 0) {
        log.success(`${warnings.healthy.length} API keys are healthy`);
        console.table(warnings.healthy.map(status => ({
          Provider: status.provider,
          Status: '✅ HEALTHY',
          'Days Until Rotation': status.daysUntilRotation,
          'Next Rotation': status.nextRotation.toISOString().split('T')[0]
        })));
      }

      if (warnings.critical.length === 0 && warnings.warnings.length === 0) {
        log.success('All API keys are healthy and up to date! 🎉');
      }

    } catch (error) {
      log.error(`Failed to check rotation status: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: generate - Generate secure secrets
program
  .command('generate')
  .description('Generate secure secrets and keys')
  .option('-t, --type <type>', 'Type (master-key, jwt-secret, nextauth-secret)', 'master-key')
  .option('-l, --length <length>', 'Length in bytes', '32')
  .action(async (options) => {
    try {
      const length = parseInt(options.length);
      let generated: string;

      switch (options.type) {
        case 'master-key':
          generated = crypto.randomBytes(length).toString('hex');
          log.info(`Generated ${length * 2}-character hex master key:`);
          break;
        case 'jwt-secret':
          generated = crypto.randomBytes(length).toString('base64');
          log.info(`Generated ${length}-byte base64 JWT secret:`);
          break;
        case 'nextauth-secret':
          generated = crypto.randomBytes(length).toString('hex');
          log.info(`Generated ${length * 2}-character NextAuth secret:`);
          break;
        default:
          log.error(`Unknown type: ${options.type}`);
          process.exit(1);
      }

      console.log(`${colors.bold}${generated}${colors.reset}`);
      log.warning('Store this securely - it won\'t be shown again!');

    } catch (error) {
      log.error(`Failed to generate secret: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: validate - Validate environment
program
  .command('validate')
  .description('Validate environment configuration')
  .action(async () => {
    try {
      log.header('Validating environment configuration');

      const env = validateEnvironment();
      log.success('Environment validation passed! ✨');

      const info = {
        'Node Environment': process.env.NODE_ENV,
        'Has OpenAI': !!process.env.OPENAI_API_KEY,
        'Has OpenRouter': !!process.env.OPENROUTER_API_KEY,
        'Has Perplexity': !!process.env.PERPLEXITY_API_KEY,
        'Has Supabase': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        'Has Redis': !!process.env.UPSTASH_REDIS_REST_URL,
      };

      console.table(info);

    } catch (error) {
      log.error(`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Command: health - Health check for secrets manager
program
  .command('health')
  .description('Health check for secrets management system')
  .action(async () => {
    try {
      log.header('Running secrets manager health check');

      const manager = getSecretsManager();
      const isHealthy = await manager.healthCheck();

      if (isHealthy) {
        log.success('Secrets manager is healthy! 💚');
      } else {
        log.error('Secrets manager health check failed');
        process.exit(1);
      }

    } catch (error) {
      log.error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Setup program
program
  .name('secrets-cli')
  .description('Makalah AI Secrets Management CLI')
  .version('1.0.0');

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}