const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte (64 hex char) key');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string (for storing Meta access tokens)
 * Returns: iv:tag:encrypted (all hex)
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string stored by encrypt()
 */
function decrypt(encryptedData) {
  if (!encryptedData) return null;
  const [ivHex, tagHex, encHex] = encryptedData.split(':');
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * Hash sensitive data for indexing (one-way, like phone numbers for lookup)
 */
function hashForIndex(value) {
  return crypto.createHmac('sha256', process.env.ENCRYPTION_KEY).update(value).digest('hex');
}

module.exports = { encrypt, decrypt, hashForIndex };
