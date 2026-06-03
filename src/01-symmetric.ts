import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// SYMMETRIC ENCRYPTION (AES-256-GCM)
// Aynı anahtar şifreler ve çözer. Hızlı, ama anahtarı karşı tarafa nasıl ileteceksin?

const key = randomBytes(32); // 256-bit anahtar
const iv = randomBytes(12); // initialization vector (her mesajda farklı olmalı)

function encrypt(plaintext: string, key: Buffer, iv: Buffer): { ciphertext: Buffer; tag: Buffer } {
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // mesajın değiştirilmediğini doğrular
  return { ciphertext, tag };
}

function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// Test
const message = "Merhaba, bu gizli bir mesaj!";
const encrypted = encrypt(message, key, iv);
console.log("Orijinal:", message);
console.log("Şifreli:", encrypted.ciphertext.toString("hex"));
console.log("Çözülen:", decrypt(encrypted.ciphertext, key, iv, encrypted.tag));
