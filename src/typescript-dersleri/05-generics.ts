// ============================================
// DERS 5: Generics (Jenerikler)
// ============================================

// Generics, TİPLERİ PARAMETRİK hale getirir.
// Aynı kodu farklı tiplerle kullanabilirsin.

// --- 1. Neden Generics? ---

// Generic OLMADAN: her tip için ayrı fonksiyon yazman gerekir
function ilkSayiyiAl(dizi: number[]): number | undefined {
  return dizi[0];
}
function ilkMetniAl(dizi: string[]): string | undefined {
  return dizi[0];
}

// Generic İLE: tek fonksiyon, tüm tipler
function ilkElemaniAl<T>(dizi: T[]): T | undefined {
  return dizi[0];
}

const sayi = ilkElemaniAl([1, 2, 3]);         // number | undefined
const metin = ilkElemaniAl(["a", "b", "c"]);  // string | undefined
console.log(sayi, metin);

// --- 2. Birden Fazla Tip Parametresi ---

function ciftOlustur<A, B>(birinci: A, ikinci: B): [A, B] {
  return [birinci, ikinci];
}

const cift = ciftOlustur("Umut", 25);       // [string, number]
const cift2 = ciftOlustur(true, [1, 2, 3]); // [boolean, number[]]
console.log(cift, cift2);

// --- 3. Generic Interface ---

interface ApiYaniti<T> {
  basarili: boolean;
  veri: T;
  hata?: string;
}

interface Kullanici {
  id: number;
  isim: string;
}

const kullaniciYaniti: ApiYaniti<Kullanici> = {
  basarili: true,
  veri: { id: 1, isim: "Umut" },
};

const sayiYaniti: ApiYaniti<number[]> = {
  basarili: true,
  veri: [1, 2, 3, 4, 5],
};

console.log("API Yanıtı:", kullaniciYaniti);

// --- 4. Generic Kısıtlama (Constraints) ---

// T'nin en az "uzunluk" alanı olmasını zorunlu kıl
interface Uzunluklu {
  length: number;
}

function uzunlukYazdir<T extends Uzunluklu>(deger: T): void {
  console.log(`Uzunluk: ${deger.length}`);
}

uzunlukYazdir("merhaba");     // 7
uzunlukYazdir([1, 2, 3]);     // 3
// uzunlukYazdir(42);         // HATA! number'ın length'i yok

// --- 5. keyof ile Kısıtlama ---

function degerAl<T, K extends keyof T>(nesne: T, anahtar: K): T[K] {
  return nesne[anahtar];
}

const kullanici = { isim: "Umut", yas: 25, sehir: "İstanbul" };
const isim = degerAl(kullanici, "isim");   // string
const yas = degerAl(kullanici, "yas");     // number
// degerAl(kullanici, "telefon");          // HATA! "telefon" anahtarı yok

console.log(isim, yas);

// --- 6. Generic Sınıf ---

class Kutu<T> {
  private icerik: T[] = [];

  ekle(eleman: T): void {
    this.icerik.push(eleman);
  }

  cikar(): T | undefined {
    return this.icerik.pop();
  }

  hepsiniGoster(): T[] {
    return [...this.icerik];
  }
}

const sayiKutusu = new Kutu<number>();
sayiKutusu.ekle(1);
sayiKutusu.ekle(2);
sayiKutusu.ekle(3);
console.log("Kutu:", sayiKutusu.hepsiniGoster());

const metinKutusu = new Kutu<string>();
metinKutusu.ekle("TypeScript");
metinKutusu.ekle("harika");
console.log("Kutu:", metinKutusu.hepsiniGoster());

// --- 7. Utility Types (Yardımcı Tipler) ---

interface Gorev {
  baslik: string;
  aciklama: string;
  tamamlandi: boolean;
  oncelik: number;
}

// Partial: tüm alanları opsiyonel yapar
type GorevGuncelleme = Partial<Gorev>;
const guncelleme: GorevGuncelleme = { tamamlandi: true };

// Required: tüm alanları zorunlu yapar
// type ZorunluGorev = Required<Gorev>;

// Pick: sadece belirli alanları seç
type GorevOzet = Pick<Gorev, "baslik" | "tamamlandi">;
const ozet: GorevOzet = { baslik: "TS öğren", tamamlandi: false };

// Omit: belirli alanları çıkar
type GorevOlusturma = Omit<Gorev, "tamamlandi">;
const yeniGorev: GorevOlusturma = {
  baslik: "Generics öğren",
  aciklama: "Çok önemli",
  oncelik: 1,
};

// Record: anahtar-değer haritası oluşturur
type GorevDurumu = Record<string, "yapilacak" | "yapiliyor" | "bitti">;
const durumlar: GorevDurumu = {
  temizlik: "bitti",
  alisveris: "yapiliyor",
  spor: "yapilacak",
};

// Readonly: tüm alanları salt okunur yapar
type DondurulmusGorev = Readonly<Gorev>;
const donmus: DondurulmusGorev = {
  baslik: "Test",
  aciklama: "...",
  tamamlandi: false,
  oncelik: 1,
};
// donmus.tamamlandi = true; // HATA! readonly

console.log("\nUtility Types:");
console.log("Güncelleme:", guncelleme);
console.log("Özet:", ozet);
console.log("Yeni Görev:", yeniGorev);
console.log("Durumlar:", durumlar);
