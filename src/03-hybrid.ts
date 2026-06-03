import {
  generateKeyPairSync,
  publicEncrypt,
  privateDecrypt,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

// HYBRID ENCRYPTION
// Share a session key with RSA, then communicate with AES.
// In the real world, WhatsApp, Signal, and TLS all do this.

// 1) Alice and Bob generate their key pairs
const alice = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const bob = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// === BOB'S SIDE ===
console.log("=== Bob: Starting session ===\n");

// 2) Bob generates a random AES key
const sessionKey = randomBytes(32);
console.log("Bob's generated session key:", sessionKey.toString("hex").slice(0, 20) + "...");

// 3) Bob encrypts the session key with Alice's public key
const encryptedSessionKey = publicEncrypt(alice.publicKey, sessionKey);
console.log("RSA-encrypted session key:", encryptedSessionKey.toString("hex").slice(0, 20) + "...");
console.log("(Sent to Alice. Even if a hacker intercepts it, they can't decrypt it)\n");

// === ALICE'S SIDE ===
console.log("=== Alice: Decrypting session key ===\n");

// 4) Alice decrypts the session key with her private key
const decryptedSessionKey = privateDecrypt(alice.privateKey, encryptedSessionKey);
console.log("Alice's decrypted session key:", decryptedSessionKey.toString("hex").slice(0, 20) + "...");
console.log("Keys match?", sessionKey.equals(decryptedSessionKey), "\n");

// === NOW BOTH HAVE THE SAME AES KEY ===
console.log("=== Fast AES messaging begins ===\n");

function aesEncrypt(text: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return { iv, ciphertext, tag: cipher.getAuthTag() };
}

function aesDecrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer) {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// Bob sends a message (AES, fast)
const msg1 = aesEncrypt("Hey Alice, how are you?", sessionKey);
console.log("Bob → Alice (encrypted):", msg1.ciphertext.toString("hex"));
console.log("Alice decrypted:", aesDecrypt(msg1.ciphertext, decryptedSessionKey, msg1.iv, msg1.tag));

// Alice replies (same session key)
const msg2 = aesEncrypt("I'm good Bob, thanks!", decryptedSessionKey);
console.log("\nAlice → Bob (encrypted):", msg2.ciphertext.toString("hex"));
console.log("Bob decrypted:", aesDecrypt(msg2.ciphertext, sessionKey, msg2.iv, msg2.tag));

console.log("\n=== Summary ===");
console.log("RSA: used only once (to share the session key)");
console.log("AES: all messages encrypted with this (fast)");
console.log("Hacker: can't decrypt the session key or any messages");
