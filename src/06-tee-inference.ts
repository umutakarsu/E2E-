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
// E2E ENCRYPTED GPU INFERENCE — TAM SİMÜLASYON
// ============================================================
//
// Senaryo: Alexandria benzeri bir sistem
// 1. Laptop'ta ekran görüntüsü alınır
// 2. Uzaktaki GPU TEE'ye şifreli gönderilir
// 3. GPU TEE içinde AI inference çalışır
// 4. Sonuç şifreli döner
// 5. Hiç kimse — sunucu OS, cloud sağlayıcı, admin — veriyi göremez

// ============================================================
// AKTÖRLER
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
      _dh: dh, // internal, TEE içinde kalır
    };
  }

  runInference(encryptedInput: Buffer, sessionKey: Buffer, iv: Buffer, tag: Buffer): {
    encryptedResult: Buffer;
    iv: Buffer;
    tag: Buffer;
  } {
    // TEE içinde deşifre
    const decipher = createDecipheriv("aes-256-gcm", sessionKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = decipher.update(encryptedInput) + decipher.final("utf8");

    // AI modeli çalıştır (simüle)
    const aiResult = this.fakeAIModel(plaintext);

    // Sonucu TEE içinde şifrele
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
    // 1: NVIDIA sertifikası geçerli mi?
    const certVerifier = createVerify("SHA256");
    certVerifier.update(attestation.gpuPublicKey);
    if (!certVerifier.verify(this.nvidiaPublicKey, attestation.certificate)) {
      console.log("  FAIL: NVIDIA sertifikası geçersiz");
      return false;
    }
    console.log("  ✓ NVIDIA sertifikası geçerli");

    // 2: Rapor GPU tarafından imzalanmış mı?
    const reportVerifier = createVerify("SHA256");
    reportVerifier.update(JSON.stringify(attestation.report));
    if (!reportVerifier.verify(attestation.gpuPublicKey, attestation.signature)) {
      console.log("  FAIL: Attestation imzası geçersiz");
      return false;
    }
    console.log("  ✓ Attestation imzası geçerli");

    // 3: Challenge eşleşiyor mu?
    if (attestation.report.challenge !== challenge.toString("hex")) {
      console.log("  FAIL: Challenge eşleşmiyor (replay attack?)");
      return false;
    }
    console.log("  ✓ Challenge eşleşiyor");

    // 4: Firmware güvenli mi?
    const trustedHash = createHash("sha256")
      .update("nvidia-tee-firmware-v3.2.1-verified")
      .digest("hex");
    if (attestation.report.firmwareHash !== trustedHash) {
      console.log("  FAIL: Firmware güvenli değil");
      return false;
    }
    console.log("  ✓ Firmware güvenli listede");

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
// SİMÜLASYON
// ============================================================

console.log("╔══════════════════════════════════════════════╗");
console.log("║  E2E ENCRYPTED GPU INFERENCE SİMÜLASYONU    ║");
console.log("╚══════════════════════════════════════════════╝\n");

// Fabrika
console.log("▸ NVIDIA fabrikada GPU üretiyor...");
const nvidia = new NVIDIACertAuthority();
const gpu = new GPUTeeTrust(nvidia);
console.log("  GPU üretildi, private key fuse'a yakıldı, sertifika verildi\n");

// Laptop
const laptop = new ClientLaptop(nvidia.publicKey);

// ADIM 1: Attestation
console.log("▸ ADIM 1: Laptop attestation istiyor");
const challenge = laptop.requestAttestation();
const attestation = gpu.attest(challenge);
console.log("  GPU attestation raporu üretti\n");

// ADIM 2: Doğrulama
console.log("▸ ADIM 2: Laptop doğruluyor");
const trusted = laptop.verifyAttestation(attestation, challenge);
if (!trusted) {
  console.log("\n⛔ GPU güvenilir değil! İşlem iptal.");
  process.exit(1);
}
console.log("  → GPU güvenilir!\n");

// ADIM 3: Güvenli kanal
console.log("▸ ADIM 3: DH ile güvenli kanal kuruluyor");
const sessionKey = laptop.establishSecureChannel(attestation.report.dhPublicKey);
// GPU tarafı da aynı session key'i hesaplar (simülasyonda direkt kullanıyoruz)
console.log("  Session key oluştu:", sessionKey.toString("hex").slice(0, 30) + "...\n");

// ADIM 4: Ekran verisi gönder
console.log("▸ ADIM 4: Ekran görüntüsü şifreleniyor");
const screenCapture = "spreadsheet: Q2 financial data, revenue numbers, employee salaries";
console.log("  Ham veri:", screenCapture);
const { encrypted, iv, tag } = laptop.encryptScreenData(screenCapture);
console.log("  Şifreli:", encrypted.toString("hex").slice(0, 40) + "...");
console.log("  (sunucu OS, cloud admin, hacker → hiçbiri okuyamaz)\n");

// ADIM 5: GPU TEE içinde inference
console.log("▸ ADIM 5: GPU TEE içinde inference çalışıyor");
console.log("  [TEE] Veri deşifre edildi (sadece TEE içinde)");
console.log("  [TEE] AI modeli çalışıyor...");
const result = gpu.runInference(encrypted, sessionKey, iv, tag);
console.log("  [TEE] Sonuç şifrelendi, TEE dışına şifreli çıkıyor\n");

// ADIM 6: Sonucu çöz
console.log("▸ ADIM 6: Laptop sonucu çözüyor");
const aiResponse = laptop.decryptResult(result.encryptedResult, result.iv, result.tag);
console.log("  AI yanıtı:", aiResponse, "\n");

// Özet
console.log("╔══════════════════════════════════════════════╗");
console.log("║  KİM NE GÖRDÜ?                              ║");
console.log("╠══════════════════════════════════════════════╣");
console.log("║  Laptop         → ham veri + AI sonucu  ✓   ║");
console.log("║  GPU TEE içi    → ham veri + AI sonucu  ✓   ║");
console.log("║  Sunucu OS      → sadece şifreli blob   ✗   ║");
console.log("║  Cloud admin    → sadece şifreli blob   ✗   ║");
console.log("║  Hacker         → sadece şifreli blob   ✗   ║");
console.log("║  NVIDIA         → sadece sertifika      ✗   ║");
console.log("╚══════════════════════════════════════════════╝");
