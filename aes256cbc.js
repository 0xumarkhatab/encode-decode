#!/usr/bin/env node
// AES-256-CBC encrypt/decrypt matching encode-decode.com behaviour
// (PHP openssl_encrypt with no IV): key = secret zero-padded/truncated to 32 bytes,
// IV = 16 zero bytes, PKCS#7 padding, base64 output.
//
// Usage:
//   node aes256cbc.js encrypt <secret> <input>
//   node aes256cbc.js decrypt <secret> <base64-input>

const crypto = require("crypto");

const ALGO = "aes-256-cbc";
const IV = Buffer.alloc(16, 0);

function keyFrom(secret) {
  const key = Buffer.alloc(32, 0);
  Buffer.from(secret, "utf8").copy(key, 0, 0, 32);
  return key;
}

function encrypt(input, secret) {
  const c = crypto.createCipheriv(ALGO, keyFrom(secret), IV);
  return Buffer.concat([c.update(input, "utf8"), c.final()]).toString("base64");
}

function decrypt(input, secret) {
  const d = crypto.createDecipheriv(ALGO, keyFrom(secret), IV);
  return Buffer.concat([d.update(input, "base64"), d.final()]).toString("utf8");
}

const [mode, secret, input] = process.argv.slice(2);

if (!mode || secret === undefined || input === undefined) {
  console.error("Usage: node aes256cbc.js <encrypt|decrypt> <secret> <input>");
  process.exit(1);
}

try {
  if (mode === "encrypt" || mode === "enc") console.log(encrypt(input, secret));
  else if (mode === "decrypt" || mode === "dec") console.log(decrypt(input, secret));
  else throw new Error(`Unknown mode "${mode}"`);
} catch (e) {
  console.error(mode.startsWith("dec") ? "Decryption failed (wrong secret or bad input)" : e.message);
  process.exit(1);
}

module.exports = { encrypt, decrypt };