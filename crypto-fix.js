// Crypto polyfill untuk MCP environment
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// Global crypto assignment
if (typeof global !== 'undefined') {
  global.crypto = {
    randomUUID: () => crypto.randomUUID(),
    getRandomValues: (array) => crypto.getRandomValues(array),
    subtle: crypto.webcrypto?.subtle || crypto.subtle,
    // Additional crypto functions
    createHash: crypto.createHash,
    createHmac: crypto.createHmac,
    timingSafeEqual: crypto.timingSafeEqual,
    constants: crypto.constants,
  };
}

// Export untuk require
module.exports = global.crypto || crypto;

console.log('[CryptoFix] ✅ Global crypto polyfill initialized');
console.log('[CryptoFix] Functions available:', Object.keys(global.crypto || {}));