/**
 * CRYPTO HELPER FOR TEST FILES - ENVIRONMENT COMPATIBILITY FIX
 * 
 * PURPOSE: Provides environment-aware crypto functionality for test files
 * FIXES: ReferenceError: crypto is not defined in browser environments
 * 
 * COMPATIBILITY: Works in both Node.js and browser environments
 */

/**
 * Generate random UUID compatible with all environments
 * 
 * Priority order:
 * 1. Web Crypto API (browser/modern Node.js)
 * 2. Node.js crypto module
 * 3. uuid library fallback
 * 
 * @returns {string} RFC 4122 compliant UUID v4
 */
function getRandomUUID() {
  // Browser Web Crypto API
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  
  // Web Workers
  if (typeof self !== 'undefined' && self.crypto && typeof self.crypto.randomUUID === 'function') {
    return self.crypto.randomUUID();
  }
  
  // Node.js crypto module
  try {
    const crypto = require('crypto');
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {
    // crypto module not available
  }
  
  // Fallback to uuid library
  try {
    const { v4: uuidv4 } = require('uuid');
    return uuidv4();
  } catch (e) {
    // uuid library not available
  }
  
  // Final fallback - manual UUID generation
  console.warn('[CRYPTO-HELPER] Using manual UUID generation fallback');
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Test environment detection
 * 
 * @returns {object} Environment information
 */
function getEnvironmentInfo() {
  return {
    hasGlobalThis: typeof globalThis !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    hasSelf: typeof self !== 'undefined',
    hasRequire: typeof require !== 'undefined',
    hasWebCrypto: typeof globalThis?.crypto?.randomUUID === 'function',
    hasNodeCrypto: (() => {
      try {
        return typeof require('crypto').randomUUID === 'function';
      } catch {
        return false;
      }
    })(),
    hasUuidLibrary: (() => {
      try {
        require('uuid');
        return true;
      } catch {
        return false;
      }
    })()
  };
}

/**
 * Validate UUID format
 * 
 * @param {string} uuid UUID to validate
 * @returns {boolean} True if valid UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Test crypto functionality
 * 
 * @returns {object} Test results
 */
function testCrypto() {
  const env = getEnvironmentInfo();
  const uuid = getRandomUUID();
  const isValid = isValidUUID(uuid);
  
  return {
    environment: env,
    generatedUUID: uuid,
    isValidFormat: isValid,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getRandomUUID,
  getEnvironmentInfo,
  isValidUUID,
  testCrypto
};