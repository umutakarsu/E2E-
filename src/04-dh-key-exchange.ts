import { createDiffieHellmanGroup, createHash } from "crypto";

// DIFFIE-HELLMAN KEY EXCHANGE
//
// Two parties create a shared secret WITHOUT ever knowing each other's private key.
// The H100 GPU's TEE does exactly this during remote attestation:
//   1. GPU generates DH parameters and signs them
//   2. Client verifies (attestation)
//   3. Both derive a shared session key via DH
//   4. All data is AES-encrypted with this key

// === 1. Alice and Bob use the same DH group (public parameter) ===
const alice = createDiffieHellmanGroup("modp14"); // 2048-bit group
const bob = createDiffieHellmanGroup("modp14");

// === 2. Each generates their own key pair ===
const alicePublicKey = alice.generateKeys();
const bobPublicKey = bob.generateKeys();

console.log("=== Public Keys (anyone can see) ===");
console.log("Alice:", alicePublicKey.toString("hex").slice(0, 40) + "...");
console.log("Bob:", bobPublicKey.toString("hex").slice(0, 40) + "...\n");

// === 3. Each computes the shared secret using the other's public key ===
const aliceSecret = alice.computeSecret(bobPublicKey);
const bobSecret = bob.computeSecret(alicePublicKey);

console.log("=== Shared Secret ===");
console.log("Alice computed:", aliceSecret.toString("hex").slice(0, 40) + "...");
console.log("Bob computed:  ", bobSecret.toString("hex").slice(0, 40) + "...");
console.log("Equal?", aliceSecret.equals(bobSecret), "\n");

// === 4. Derive an AES key from the shared secret ===
const sessionKey = createHash("sha256").update(aliceSecret).digest();
console.log("AES-256 session key:", sessionKey.toString("hex"));
console.log("(AES-GCM encrypted communication begins now)\n");

// === Why is this secure? ===
console.log("=== What does a hacker see? ===");
console.log("- Alice's public key  ✓ (visible)");
console.log("- Bob's public key    ✓ (visible)");
console.log("- Shared secret       ✗ (can't compute!)");
console.log("- Session key         ✗ (can't compute!)");
console.log("\nBecause: deriving a private key from a public key is");
console.log("mathematically infeasible in practical time (discrete log problem)");

// === In the GPU TEE context ===
console.log("\n=== How this works in an H100 GPU TEE ===");
console.log("1. GPU gets a private key burned into fuses at manufacturing");
console.log("2. NVIDIA signs the corresponding public key as a certificate");
console.log("3. Client requests attestation → GPU signs firmware hash + DH params");
console.log("4. Client verifies using NVIDIA's certificate (remote attestation)");
console.log("5. DH produces a session key → all data is AES-encrypted");
console.log("6. Even the host OS can't see the data, because the key only exists inside the TEE");
