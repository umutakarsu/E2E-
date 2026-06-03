import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// SYMMETRIC ENCRYPTION (AES-256-GCM)
// Same key encrypts and decrypts. Fast, but how do you share the key?

const key = randomBytes(32); // 256-bit key
const iv = randomBytes(12); // initialization vector (must be unique per message)

function encrypt(plaintext: string, key: Buffer, iv: Buffer): { ciphertext: Buffer; tag: Buffer } {
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // verifies the message hasn't been tampered with
  return { ciphertext, tag };
}

function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// Test
const message = "Hello, this is a secret message!";
const encrypted = encrypt(message, key, iv);
console.log("Original:", message);
console.log("Encrypted:", encrypted.ciphertext.toString("hex"));
console.log("Decrypted:", decrypt(encrypted.ciphertext, key, iv, encrypted.tag));
