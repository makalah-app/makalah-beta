try {
  const { webcrypto } = require('node:crypto');
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  if (!global.crypto) global.crypto = globalThis.crypto;
} catch (e) {
  // Ignore if crypto not available; MCP may still run
}
