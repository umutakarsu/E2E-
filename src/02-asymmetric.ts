import { generateKeyPairSync, publicEncrypt, privateDecrypt } from "crypto";

// ASYMMETRIC ENCRYPTION (RSA)
//
// Problem: In symmetric encryption, both parties must know the same key.
//          But how do you share the key without a secure channel?
//
// Solution: Everyone gets two keys:
//           - Public key  → shared openly, used to ENCRYPT
//           - Private key → kept secret, used to DECRYPT

// 1) Alice and Bob each generate their own key pair
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

console.log("=== Alice's Public Key (anyone can see) ===");
console.log(alice.publicKey.slice(0, 80) + "...\n");

console.log("=== Alice's Private Key (only Alice has this) ===");
console.log(alice.privateKey.slice(0, 80) + "...\n");

// 2) Bob wants to send Alice a message
//    He encrypts it with Alice's PUBLIC key
const message = "Hey Alice, this is a secret message!";
const encrypted = publicEncrypt(alice.publicKey, Buffer.from(message));
console.log("Bob's encrypted message:", encrypted.toString("hex").slice(0, 60) + "...\n");

// 3) Alice decrypts with her PRIVATE key
const decrypted = privateDecrypt(alice.privateKey, encrypted);
console.log("Alice decrypted:", decrypted.toString("utf8"));

// 4) What if someone tries to decrypt with Bob's private key?
try {
  privateDecrypt(bob.privateKey, encrypted);
} catch {
  console.log("\nBob tried to decrypt with his own private key → FAILED!");
  console.log("Because the message was encrypted with Alice's public key.");
  console.log("Only Alice's private key can decrypt it.");
}
