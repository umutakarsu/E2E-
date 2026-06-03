import { createDiffieHellmanGroup, createHash } from "crypto";

// DIFFIE-HELLMAN KEY EXCHANGE
//
// İki taraf birbirinin private key'ini BİLMEDEN ortak bir sır üretir.
// H100 GPU'nun TEE'si remote attestation sırasında tam olarak bunu yapar:
//   1. GPU, DH parametreleri üretir ve imzalar
//   2. İstemci doğrular (attestation)
//   3. İkisi DH ile ortak session key oluşturur
//   4. Tüm veri bu key ile AES-şifreli gider/gelir

// === 1. Ali ve Ayşe aynı DH grubunu kullanır (public parametre) ===
const ali = createDiffieHellmanGroup("modp14");   // 2048-bit grup
const ayse = createDiffieHellmanGroup("modp14");

// === 2. Her biri kendi key çiftini üretir ===
const aliPublicKey = ali.generateKeys();
const aysePublicKey = ayse.generateKeys();

console.log("=== Public Key'ler (herkes görebilir) ===");
console.log("Ali:", aliPublicKey.toString("hex").slice(0, 40) + "...");
console.log("Ayşe:", aysePublicKey.toString("hex").slice(0, 40) + "...\n");

// === 3. Her biri karşının public key'i ile ortak sırrı hesaplar ===
const aliSecret = ali.computeSecret(aysePublicKey);
const ayseSecret = ayse.computeSecret(aliPublicKey);

console.log("=== Ortak Sır (shared secret) ===");
console.log("Ali hesapladı: ", aliSecret.toString("hex").slice(0, 40) + "...");
console.log("Ayşe hesapladı:", ayseSecret.toString("hex").slice(0, 40) + "...");
console.log("Eşit mi?", aliSecret.equals(ayseSecret), "\n");

// === 4. Shared secret'tan AES key türet ===
const sessionKey = createHash("sha256").update(aliSecret).digest();
console.log("AES-256 session key:", sessionKey.toString("hex"));
console.log("(artık bu key ile AES-GCM şifreli iletişim başlar)\n");

// === Neden güvenli? ===
console.log("=== Hacker ne görür? ===");
console.log("- Ali'nin public key'i  ✓ (görebilir)");
console.log("- Ayşe'nin public key'i ✓ (görebilir)");
console.log("- Ortak sır             ✗ (hesaplayamaz!)");
console.log("- Session key           ✗ (hesaplayamaz!)");
console.log("\nÇünkü: public key'lerden private key'i bulmak");
console.log("matematiksel olarak pratik sürede imkansız (discrete log problemi)");

// === GPU TEE bağlamında ===
console.log("\n=== H100 GPU TEE'de bu nasıl çalışır? ===");
console.log("1. GPU üretimde private key fuse'a yakılır");
console.log("2. NVIDIA bu key'in public karşılığını sertifika ile imzalar");
console.log("3. İstemci attestation ister → GPU firmware hash + DH params imzalar");
console.log("4. İstemci NVIDIA sertifikası ile doğrular (remote attestation)");
console.log("5. DH ile session key oluşur → tüm veri AES ile şifrelenir");
console.log("6. Sunucu OS'u bile veriyi göremez, çünkü key sadece TEE içinde");
