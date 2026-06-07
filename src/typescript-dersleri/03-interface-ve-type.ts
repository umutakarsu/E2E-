// ============================================
// DERS 3: Interface ve Type Alias
// ============================================

// Kendi tiplerini tanımlamak TypeScript'in en güçlü özelliği.

// --- 1. Interface: Nesne Şekli Tanımlama ---

interface Kullanici {
  isim: string;
  yas: number;
  email: string;
  aktifMi: boolean;
}

const kullanici1: Kullanici = {
  isim: "Umut",
  yas: 25,
  email: "umut@example.com",
  aktifMi: true,
};

// Bu HATA verir çünkü "yas" eksik:
// const kullanici2: Kullanici = { isim: "Ali", email: "ali@x.com", aktifMi: false };

// --- 2. Opsiyonel Alanlar (?) ---

interface Urun {
  isim: string;
  fiyat: number;
  aciklama?: string; // opsiyonel - olmasa da olur
}

const urun1: Urun = { isim: "Laptop", fiyat: 25000 }; // aciklama yok, sorun değil
const urun2: Urun = { isim: "Telefon", fiyat: 15000, aciklama: "Son model" };

// --- 3. Readonly (Salt Okunur) ---

interface Ayarlar {
  readonly veritabaniUrl: string;
  readonly port: number;
}

const ayarlar: Ayarlar = { veritabaniUrl: "localhost:5432", port: 3000 };
// ayarlar.port = 4000; // HATA! readonly değiştirilemez

// --- 4. Type Alias ---

// Type ile de nesne şekli tanımlayabilirsin
type Koordinat = {
  x: number;
  y: number;
};

const nokta: Koordinat = { x: 10, y: 20 };

// --- 5. Union Types (Birleşim Tipleri) ---

// Bir değişken birden fazla tipte olabilir
type Durum = "bekliyor" | "islemde" | "tamamlandi" | "hata";

let siparisDurumu: Durum = "bekliyor";
siparisDurumu = "tamamlandi";
// siparisDurumu = "iptal"; // HATA! Bu değer listede yok

type SayiVeyaMetin = string | number;

function yazdir(deger: SayiVeyaMetin): void {
  if (typeof deger === "string") {
    console.log(`Metin: ${deger.toUpperCase()}`);
  } else {
    console.log(`Sayı: ${deger.toFixed(2)}`);
  }
}

// --- 6. Intersection Types (Kesişim Tipleri) ---

type Isim = { isim: string };
type Yas = { yas: number };

// & ile iki tipi birleştir
type Kisi = Isim & Yas;

const kisi: Kisi = { isim: "Umut", yas: 25 }; // ikisi de zorunlu

// --- 7. Interface Genişletme (extends) ---

interface Hayvan {
  isim: string;
  yas: number;
}

interface Kedi extends Hayvan {
  cinsi: string;
  icMekanMi: boolean;
}

const kedi: Kedi = {
  isim: "Boncuk",
  yas: 3,
  cinsi: "Tekir",
  icMekanMi: true,
};

// --- 8. Interface vs Type: Ne Zaman Hangisi? ---

// Interface: Nesne şekilleri için (extends ile genişletilebilir)
// Type: Union, intersection, primitif alias'lar için

// Interface birleştirilebilir (declaration merging):
interface Ogrenci {
  isim: string;
}
interface Ogrenci {
  numara: number;
}
// Artık Ogrenci hem isim hem numara içerir
const ogrenci: Ogrenci = { isim: "Ali", numara: 123 };

// --- 9. Index Signature ---

// Anahtarları önceden bilinmeyen nesneler için
interface Sozluk {
  [anahtar: string]: string;
}

const turkceIngilizce: Sozluk = {
  merhaba: "hello",
  dunya: "world",
  programlama: "programming",
};

// --- 10. Literal Types ---

type Yon = "kuzey" | "guney" | "dogu" | "bati";
type ZarDegeri = 1 | 2 | 3 | 4 | 5 | 6;

function zarAt(): ZarDegeri {
  return (Math.floor(Math.random() * 6) + 1) as ZarDegeri;
}

// --- ÇALIŞTIR ---
console.log("=== Ders 3: Interface ve Type ===");
console.log("Kullanıcı:", kullanici1);
console.log("Ürün:", urun1);
console.log("Kedi:", kedi);
console.log("Öğrenci:", ogrenci);
console.log("Sözlük:", turkceIngilizce);
yazdir("merhaba");
yazdir(3.14159);
console.log("Zar:", zarAt());
