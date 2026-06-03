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

// ============================================================
// E2E ENCRYPTED GPU INFERENCE — FULL SIMULATION
// ============================================================
//
// Scenario: A system similar to confidential AI inference platforms
// 1. A screenshot is captured on the laptop
// 2. It's sent encrypted to a remote GPU TEE
// 3. AI inference runs inside the GPU TEE
// 4. The result returns encrypted
// 5. Nobody — host OS, cloud provider, admin — can see the data

// ============================================================
// ACTORS
// ============================================================

class NVIDIACertAuthority {
  publicKey: string;
  private privateKey: string;

  constructor() {
    const keys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    this.publicKey = keys.publicKey;
    this.privateKey = keys.privateKey;
  }

  certifyGPU(gpuPublicKey: string): Buffer {
    const signer = createSign("SHA256");
    signer.update(gpuPublicKey);
    return signer.sign(this.privateKey);
  }
}

class GPUTeeTrust {
  publicKey: string;
  private privateKey: string;
  private certificate: Buffer;
  private firmware = "nvidia-tee-firmware-v3.2.1-verified";

  constructor(nvidia: NVIDIACertAuthority) {
    const keys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    this.publicKey = keys.publicKey;
    this.privateKey = keys.privateKey;
    this.certificate = nvidia.certifyGPU(this.publicKey);
  }

  attest(challenge: Buffer) {
    const dh = createDiffieHellmanGroup("modp14");
    const dhPublicKey = dh.generateKeys();

    const report = {
      firmwareHash: createHash("sha256").update(this.firmware).digest("hex"),
      challenge: challenge.toString("hex"),
      dhPublicKey: dhPublicKey.toString("hex"),
    };

    const signer = createSign("SHA256");
    signer.update(JSON.stringify(report));

    return {
      report,
      signature: signer.sign(this.privateKey),
      certificate: this.certificate,
      gpuPublicKey: this.publicKey,
      _dh: dh, // internal, stays inside the TEE
    };
  }

  runInference(encryptedInput: Buffer, sessionKey: Buffer, iv: Buffer, tag: Buffer): {
    encryptedResult: Buffer;
    iv: Buffer;
    tag: Buffer;
  } {
    // Decrypt inside TEE
    const decipher = createDecipheriv("aes-256-gcm", sessionKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = decipher.update(encryptedInput) + decipher.final("utf8");

    // Run AI model (simulated)
    const aiResult = this.fakeAIModel(plaintext);

    // Encrypt result inside TEE
    const resultIv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", sessionKey, resultIv);
    const encryptedResult = Buffer.concat([cipher.update(aiResult, "utf8"), cipher.final()]);

    return { encryptedResult, iv: resultIv, tag: cipher.getAuthTag() };
  }

  private fakeAIModel(screenData: string): string {
    if (screenData.includes("spreadsheet")) {
      return "Q2 revenue: $2.4M | Growth: 18% | Action: increase marketing budget";
    }
    if (screenData.includes("email")) {
      return "3 urgent emails detected | 1 meeting conflict at 2pm | suggest: reschedule";
    }
    return "Screen analyzed: no actionable items found";
  }
}

class ClientLaptop {
  private nvidiaPublicKey: string;
  private sessionKey: Buffer | null = null;

  constructor(nvidiaPublicKey: string) {
    this.nvidiaPublicKey = nvidiaPublicKey;
  }

  requestAttestation() {
    return randomBytes(32);
  }

  verifyAttestation(
    attestation: ReturnType<GPUTeeTrust["attest"]>,
    challenge: Buffer
  ): boolean {
    // 1: Is the NVIDIA certificate valid?
    const certVerifier = createVerify("SHA256");
    certVerifier.update(attestation.gpuPublicKey);
    if (!certVerifier.verify(this.nvidiaPublicKey, attestation.certificate)) {
      console.log("  FAIL: Invalid NVIDIA certificate");
      return false;
    }
    console.log("  ✓ NVIDIA certificate valid");

    // 2: Was the report signed by the GPU?
    const reportVerifier = createVerify("SHA256");
    reportVerifier.update(JSON.stringify(attestation.report));
    if (!reportVerifier.verify(attestation.gpuPublicKey, attestation.signature)) {
      console.log("  FAIL: Invalid attestation signature");
      return false;
    }
    console.log("  ✓ Attestation signature valid");

    // 3: Does the challenge match?
    if (attestation.report.challenge !== challenge.toString("hex")) {
      console.log("  FAIL: Challenge mismatch (replay attack?)");
      return false;
    }
    console.log("  ✓ Challenge matches");

    // 4: Is the firmware trusted?
    const trustedHash = createHash("sha256")
      .update("nvidia-tee-firmware-v3.2.1-verified")
      .digest("hex");
    if (attestation.report.firmwareHash !== trustedHash) {
      console.log("  FAIL: Firmware not trusted");
      return false;
    }
    console.log("  ✓ Firmware on trusted list");

    return true;
  }

  establishSecureChannel(gpuDHPublicKeyHex: string): Buffer {
    const clientDH = createDiffieHellmanGroup("modp14");
    clientDH.generateKeys();

    const sharedSecret = clientDH.computeSecret(Buffer.from(gpuDHPublicKeyHex, "hex"));
    this.sessionKey = createHash("sha256").update(sharedSecret).digest();
    return this.sessionKey;
  }

  encryptScreenData(screenData: string): { encrypted: Buffer; iv: Buffer; tag: Buffer } {
    if (!this.sessionKey) throw new Error("Secure channel not established");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.sessionKey, iv);
    const encrypted = Buffer.concat([cipher.update(screenData, "utf8"), cipher.final()]);
    return { encrypted, iv, tag: cipher.getAuthTag() };
  }

  decryptResult(encrypted: Buffer, iv: Buffer, tag: Buffer): string {
    if (!this.sessionKey) throw new Error("Secure channel not established");
    const decipher = createDecipheriv("aes-256-gcm", this.sessionKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  }
}

// ============================================================
// SIMULATION
// ============================================================

console.log("╔══════════════════════════════════════════════════╗");
console.log("║  E2E ENCRYPTED GPU INFERENCE SIMULATION          ║");
console.log("╚══════════════════════════════════════════════════╝\n");

// Factory
console.log("▸ NVIDIA manufacturing GPU...");
const nvidia = new NVIDIACertAuthority();
const gpu = new GPUTeeTrust(nvidia);
console.log("  GPU manufactured, private key burned into fuses, certificate issued\n");

// Laptop
const laptop = new ClientLaptop(nvidia.publicKey);

// STEP 1: Attestation
console.log("▸ STEP 1: Laptop requests attestation");
const challenge = laptop.requestAttestation();
const attestation = gpu.attest(challenge);
console.log("  GPU produced attestation report\n");

// STEP 2: Verification
console.log("▸ STEP 2: Laptop verifying");
const trusted = laptop.verifyAttestation(attestation, challenge);
if (!trusted) {
  console.log("\n⛔ GPU is not trusted! Aborting.");
  process.exit(1);
}
console.log("  → GPU is trusted!\n");

// STEP 3: Secure channel
console.log("▸ STEP 3: Establishing secure channel via DH");
const sessionKey = laptop.establishSecureChannel(attestation.report.dhPublicKey);
console.log("  Session key created:", sessionKey.toString("hex").slice(0, 30) + "...\n");

// STEP 4: Send screen data
console.log("▸ STEP 4: Encrypting screen capture");
const screenCapture = "spreadsheet: Q2 financial data, revenue numbers, employee salaries";
console.log("  Raw data:", screenCapture);
const { encrypted, iv, tag } = laptop.encryptScreenData(screenCapture);
console.log("  Encrypted:", encrypted.toString("hex").slice(0, 40) + "...");
console.log("  (host OS, cloud admin, hacker → none of them can read this)\n");

// STEP 5: GPU TEE inference
console.log("▸ STEP 5: GPU running inference inside TEE");
console.log("  [TEE] Data decrypted (only inside TEE)");
console.log("  [TEE] AI model running...");
const result = gpu.runInference(encrypted, sessionKey, iv, tag);
console.log("  [TEE] Result encrypted, leaves TEE as ciphertext\n");

// STEP 6: Decrypt result
console.log("▸ STEP 6: Laptop decrypts result");
const aiResponse = laptop.decryptResult(result.encryptedResult, result.iv, result.tag);
console.log("  AI response:", aiResponse, "\n");

// Summary
console.log("╔══════════════════════════════════════════════════╗");
console.log("║  WHO SAW WHAT?                                   ║");
console.log("╠══════════════════════════════════════════════════╣");
console.log("║  Laptop         → raw data + AI result      ✓   ║");
console.log("║  GPU TEE inside → raw data + AI result      ✓   ║");
console.log("║  Host OS        → encrypted blob only       ✗   ║");
console.log("║  Cloud admin    → encrypted blob only       ✗   ║");
console.log("║  Hacker         → encrypted blob only       ✗   ║");
console.log("║  NVIDIA         → certificate only          ✗   ║");
console.log("╚══════════════════════════════════════════════════╝");
