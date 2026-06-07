// ============================================
// DERS 2: Fonksiyonlar
// ============================================

// TypeScript'te fonksiyonların parametrelerine ve
// dönüş değerlerine tip verebilirsin.

// --- 1. Basit Fonksiyon ---

function topla(a: number, b: number): number {
  return a + b;
}

console.log(topla(3, 5)); // 8
// topla("3", 5); // HATA! string gönderemezsin

// --- 2. Arrow Function (Ok Fonksiyonu) ---

const carp = (a: number, b: number): number => a * b;

console.log(carp(4, 5)); // 20

// --- 3. Opsiyonel Parametre (?) ---

function selamla(isim: string, soyisim?: string): string {
  if (soyisim) {
    return `Merhaba ${isim} ${soyisim}!`;
  }
  return `Merhaba ${isim}!`;
}

console.log(selamla("Umut"));           // "Merhaba Umut!"
console.log(selamla("Umut", "Akarsu")); // "Merhaba Umut Akarsu!"

// --- 4. Varsayılan Değer (Default Parameter) ---

function selamlaV2(isim: string, dil: string = "tr"): string {
  if (dil === "tr") return `Merhaba ${isim}!`;
  return `Hello ${isim}!`;
}

console.log(selamlaV2("Umut"));       // "Merhaba Umut!"
console.log(selamlaV2("Umut", "en")); // "Hello Umut!"

// --- 5. Rest Parametreler (...) ---

function toplam(...sayilar: number[]): number {
  return sayilar.reduce((acc, sayi) => acc + sayi, 0);
}

console.log(toplam(1, 2, 3, 4, 5)); // 15

// --- 6. Fonksiyon Tipi Tanımlama ---

// Fonksiyonun kendisi de bir tip olabilir
type MatematikIslem = (a: number, b: number) => number;

const cikar: MatematikIslem = (a, b) => a - b;
const bol: MatematikIslem = (a, b) => a / b;

console.log(cikar(10, 3)); // 7
console.log(bol(20, 4));   // 5

// --- 7. Callback Fonksiyonlar ---

function sayiIsle(sayilar: number[], islem: (n: number) => number): number[] {
  return sayilar.map(islem);
}

const sonuc1 = sayiIsle([1, 2, 3], (n) => n * 2);    // [2, 4, 6]
const sonuc2 = sayiIsle([1, 2, 3], (n) => n * n);     // [1, 4, 9]

console.log("x2:", sonuc1);
console.log("x²:", sonuc2);

// --- 8. Generic Fonksiyonlar (İleri Seviye Giriş) ---

// T bir "tip parametresi" - fonksiyon çağrılırken belirlenir
function ilkEleman<T>(dizi: T[]): T | undefined {
  return dizi[0];
}

const ilkSayi = ilkEleman([10, 20, 30]);      // number | undefined
const ilkKelime = ilkEleman(["a", "b", "c"]); // string | undefined

console.log("İlk sayı:", ilkSayi);   // 10
console.log("İlk kelime:", ilkKelime); // "a"

// --- 9. Overload (Aşırı Yükleme) ---

function formatla(deger: string): string;
function formatla(deger: number): string;
function formatla(deger: string | number): string {
  if (typeof deger === "string") {
    return deger.toUpperCase();
  }
  return deger.toFixed(2);
}

console.log(formatla("merhaba")); // "MERHABA"
console.log(formatla(3.14159));   // "3.14"

// --- ÇALIŞTIR ---
console.log("\n=== Ders 2: Fonksiyonlar ===");
console.log("Tüm örnekler yukarıda çalıştı!");
