import { generateKeyPairSync, publicEncrypt, privateDecrypt } from "crypto";

// ASYMMETRIC ENCRYPTION (RSA)
//
// Problem: Symmetric'te aynı anahtarı iki taraf da bilmeli.
//          Ama anahtarı güvenli kanal olmadan nasıl paylaşırsın?
//
// Çözüm:  Herkesin iki anahtarı olsun:
//          - Public key  → herkese açık, bununla ŞİFRELERSİN
//          - Private key → sadece sende, bununla ÇÖZERSİN

// 1) Ali ve Ayşe kendi anahtar çiftlerini üretir
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

console.log("=== Ali'nin Public Key'i (herkes görebilir) ===");
console.log(ali.publicKey.slice(0, 80) + "...\n");

console.log("=== Ali'nin Private Key'i (sadece Ali'de) ===");
console.log(ali.privateKey.slice(0, 80) + "...\n");

// 2) Ayşe, Ali'ye mesaj göndermek istiyor
//    Ali'nin PUBLIC key'i ile şifreler
const mesaj = "Selam Ali, bu gizli bir mesaj!";
const sifreli = publicEncrypt(ali.publicKey, Buffer.from(mesaj));
console.log("Ayşe'nin şifrelediği mesaj:", sifreli.toString("hex").slice(0, 60) + "...\n");

// 3) Ali, kendi PRIVATE key'i ile çözer
const cozulen = privateDecrypt(ali.privateKey, sifreli);
console.log("Ali'nin çözdüğü mesaj:", cozulen.toString("utf8"));

// 4) Peki biri Ayşe'nin public key'i ile çözmeye çalışırsa?
try {
  privateDecrypt(ayse.privateKey, sifreli);
} catch {
  console.log("\nAyşe kendi private key'i ile çözmeye çalıştı → BAŞARISIZ!");
  console.log("Çünkü mesaj Ali'nin public key'i ile şifrelendi.");
  console.log("Sadece Ali'nin private key'i çözebilir.");
}
