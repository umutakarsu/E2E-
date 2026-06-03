import {
  generateKeyPairSync,
  createSign,
  createVerify,
  createHash,
  createDiffieHellmanGroup,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

// REMOTE ATTESTATION SIMULATION
//
// Question: How do you verify that a remote GPU is actually running
//           in secure TEE mode? A fake server could be tricking you.
//
// Answer: Remote Attestation — the GPU proves itself, you verify.

// ============================================================
// STEP 0: Manufacturing time (NVIDIA factory)
// ============================================================
// A private key is burned into fuses when the GPU is manufactured.
// NVIDIA signs the corresponding public key and issues a certificate.

const nvidia = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const gpu = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// NVIDIA signs the GPU's public key → certificate
const gpuCertSigner = createSign("SHA256");
gpuCertSigner.update(gpu.publicKey);
const gpuCertificate = gpuCertSigner.sign(nvidia.privateKey);

console.log("=== STEP 0: At the factory ===");
console.log("GPU private key burned into fuses");
console.log("NVIDIA certificate created:", gpuCertificate.toString("hex").slice(0, 40) + "...\n");

// ============================================================
// STEP 1: Client (your laptop) requests attestation
// ============================================================
const challenge = randomBytes(32); // prevents replay attacks
console.log("=== STEP 1: Client requests attestation ===");
console.log("Challenge sent:", challenge.toString("hex").slice(0, 40) + "...\n");

// ============================================================
// STEP 2: GPU produces an attestation report
// ============================================================
// The GPU signs:
//   - firmware hash (what code is running)
//   - challenge (replay protection)
//   - DH public key (for secure channel)

const firmwareCode = "nvidia-tee-firmware-v3.2.1-verified";
const firmwareHash = createHash("sha256").update(firmwareCode).digest("hex");

const gpuDH = createDiffieHellmanGroup("modp14");
const gpuDHPublicKey = gpuDH.generateKeys();

const attestationData = JSON.stringify({
  firmwareHash,
  challenge: challenge.toString("hex"),
  dhPublicKey: gpuDHPublicKey.toString("hex"),
  timestamp: Date.now(),
});

const reportSigner = createSign("SHA256");
reportSigner.update(attestationData);
const attestationSignature = reportSigner.sign(gpu.privateKey);

console.log("=== STEP 2: GPU produces attestation report ===");
console.log("Firmware hash:", firmwareHash.slice(0, 40) + "...");
console.log("DH public key included");
console.log("Report signed with GPU's private key\n");

// ============================================================
// STEP 3: Client verifies the report
// ============================================================
console.log("=== STEP 3: Client verifying ===");

// 3a: Was the GPU certificate signed by NVIDIA?
const certVerifier = createVerify("SHA256");
certVerifier.update(gpu.publicKey);
const certValid = certVerifier.verify(nvidia.publicKey, gpuCertificate);
console.log("1. Is the NVIDIA certificate valid?", certValid ? "YES" : "NO");

// 3b: Was the attestation report signed by the GPU?
const reportVerifier = createVerify("SHA256");
reportVerifier.update(attestationData);
const reportValid = reportVerifier.verify(gpu.publicKey, attestationSignature);
console.log("2. Is the attestation report valid?", reportValid ? "YES" : "NO");

// 3c: Does the challenge match? (replay attack protection)
const parsedReport = JSON.parse(attestationData);
const challengeMatch = parsedReport.challenge === challenge.toString("hex");
console.log("3. Does the challenge match?", challengeMatch ? "YES" : "NO");

// 3d: Is the firmware a known safe version?
const knownSafeFirmwares = [
  createHash("sha256").update("nvidia-tee-firmware-v3.2.1-verified").digest("hex"),
];
const firmwareTrusted = knownSafeFirmwares.includes(parsedReport.firmwareHash);
console.log("4. Is the firmware on the trusted list?", firmwareTrusted ? "YES" : "NO");

// ============================================================
// STEP 4: Establish secure channel (DH key exchange)
// ============================================================
if (certValid && reportValid && challengeMatch && firmwareTrusted) {
  console.log("\n=== STEP 4: All checks passed! Establishing secure channel ===");

  const clientDH = createDiffieHellmanGroup("modp14");
  const clientDHPublicKey = clientDH.generateKeys();

  const sharedSecret = clientDH.computeSecret(
    Buffer.from(parsedReport.dhPublicKey, "hex")
  );
  const sessionKey = createHash("sha256").update(sharedSecret).digest();

  console.log("Session key created via DH:", sessionKey.toString("hex").slice(0, 40) + "...\n");

  // Now send encrypted data using this key
  const screenData = "screenshot-pixels-base64-data-highly-confidential-screen-capture";

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey, iv);
  const encrypted = Buffer.concat([cipher.update(screenData, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  console.log("=== STEP 5: Encrypted inference ===");
  console.log("Screen data encrypted:", encrypted.toString("hex").slice(0, 40) + "...");
  console.log("The host OS cannot see this — it's only decrypted inside the TEE");
  console.log("GPU runs inference inside TEE → result returns encrypted");

  // GPU-side decryption (inside TEE)
  const decipher = createDecipheriv("aes-256-gcm", sessionKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = decipher.update(encrypted) + decipher.final("utf8");
  console.log("Decrypted inside TEE:", decrypted.slice(0, 50) + "...");
} else {
  console.log("\nATTESTATION FAILED — do not trust this GPU!");
}
