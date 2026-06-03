import {
  generateKeyPairSync,
  publicEncrypt,
  privateDecrypt,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

// HYBRID ENCRYPTION
// RSA ile session key paylaş, AES ile mesajlaş.
// Gerçek dünyada WhatsApp, Signal, TLS hepsi bunu yapar.

// 1) Ali ve Ayşe anahtar çiftlerini üretir
const ali = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const ayse = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// === AYŞE TARAFI ===
console.log("=== Ayşe: Session başlatıyor ===\n");

// 2) Ayşe rastgele bir AES key üretir
const sessionKey = randomBytes(32);
console.log("Ayşe'nin ürettiği session key:", sessionKey.toString("hex").slice(0, 20) + "...");

// 3) Session key'i Ali'nin public key'i ile şifreler
const encryptedSessionKey = publicEncrypt(ali.publicKey, sessionKey);
console.log("RSA ile şifrelenmiş session key:", encryptedSessionKey.toString("hex").slice(0, 20) + "...");
console.log("(Bunu Ali'ye gönderir. Hacker yakalasa bile çözemez)\n");

// === ALİ TARAFI ===
console.log("=== Ali: Session key'i çözüyor ===\n");

// 4) Ali kendi private key'i ile session key'i çözer
const decryptedSessionKey = privateDecrypt(ali.privateKey, encryptedSessionKey);
console.log("Ali'nin çözdüğü session key:", decryptedSessionKey.toString("hex").slice(0, 20) + "...");
console.log("Eşleşiyor mu?", sessionKey.equals(decryptedSessionKey), "\n");

// === ARTIK İKİSİ DE AYNI AES KEY'E SAHİP ===
console.log("=== Artık AES ile hızlı mesajlaşma ===\n");

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

// Ayşe mesaj gönderiyor (AES ile, hızlı)
const msg1 = aesEncrypt("Selam Ali, nasılsın?", sessionKey);
console.log("Ayşe → Ali (şifreli):", msg1.ciphertext.toString("hex"));
console.log("Ali çözdü:", aesDecrypt(msg1.ciphertext, decryptedSessionKey, msg1.iv, msg1.tag));

// Ali cevap veriyor (aynı session key ile)
const msg2 = aesEncrypt("İyiyim Ayşe, teşekkürler!", decryptedSessionKey);
console.log("\nAli → Ayşe (şifreli):", msg2.ciphertext.toString("hex"));
console.log("Ayşe çözdü:", aesDecrypt(msg2.ciphertext, sessionKey, msg2.iv, msg2.tag));

console.log("\n=== Özet ===");
console.log("RSA: sadece 1 kere kullanıldı (session key paylaşımı)");
console.log("AES: tüm mesajlar bununla şifrelendi (hızlı)");
console.log("Hacker: ne session key'i ne mesajları çözebilir");
