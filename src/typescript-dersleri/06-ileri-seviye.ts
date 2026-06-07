// ============================================
// DERS 6: İleri Seviye TypeScript
// ============================================

// --- 1. Discriminated Unions (Ayrıştırılmış Birleşimler) ---

// Farklı durumları tip-güvenli şekilde modellemek için
type Basarili<T> = {
  durum: "basarili";
  veri: T;
};

type Hata = {
  durum: "hata";
  mesaj: string;
  kod: number;
};

type Yukleniyor = {
  durum: "yukleniyor";
};

type Sonuc<T> = Basarili<T> | Hata | Yukleniyor;

function sonucuIsle<T>(sonuc: Sonuc<T>): string {
  switch (sonuc.durum) {
    case "basarili":
      return `Başarılı! Veri: ${JSON.stringify(sonuc.veri)}`;
    case "hata":
      return `Hata ${sonuc.kod}: ${sonuc.mesaj}`;
    case "yukleniyor":
      return "Yükleniyor...";
  }
}

console.log(sonucuIsle({ durum: "basarili", veri: { id: 1 } }));
console.log(sonucuIsle({ durum: "hata", mesaj: "Bulunamadı", kod: 404 }));
console.log(sonucuIsle({ durum: "yukleniyor" }));

// --- 2. Type Guards (Tip Korumaları) ---

interface Kedi {
  miyavla(): void;
  tipiHayvan: "kedi";
}

interface Kopek {
  havla(): void;
  tipiHayvan: "kopek";
}

type EvcilHayvan = Kedi | Kopek;

function hayvanSesiCikar(hayvan: EvcilHayvan): void {
  if (hayvan.tipiHayvan === "kedi") {
    hayvan.miyavla(); // TypeScript burada Kedi olduğunu bilir
  } else {
    hayvan.havla();   // TypeScript burada Kopek olduğunu bilir
  }
}

// --- 3. Mapped Types (Eşlenmiş Tipler) ---

// Var olan bir tipin tüm alanlarını dönüştür
type Opsiyonel<T> = {
  [K in keyof T]?: T[K];
};

type SaltOkunur<T> = {
  readonly [K in keyof T]: T[K];
};

type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

interface Kullanici {
  isim: string;
  yas: number;
  email: string;
}

type OpsiyonelKullanici = Opsiyonel<Kullanici>;
type NullableKullanici = Nullable<Kullanici>;

const kpiOpsiyonel: OpsiyonelKullanici = { isim: "Umut" }; // diğerleri opsiyonel
const kpiNullable: NullableKullanici = { isim: null, yas: 25, email: null };

// --- 4. Conditional Types (Koşullu Tipler) ---

type MetinMi<T> = T extends string ? "evet" : "hayir";

type Test1 = MetinMi<string>;  // "evet"
type Test2 = MetinMi<number>;  // "hayir"

// Pratik örnek: dizi ise elemanını al, değilse kendisini al
type DiziElemani<T> = T extends (infer E)[] ? E : T;

type A = DiziElemani<string[]>;  // string
type B = DiziElemani<number>;    // number

// --- 5. Template Literal Types ---

type HTTPMetod = "GET" | "POST" | "PUT" | "DELETE";
type APIEndpoint = "/users" | "/products" | "/orders";

type APIRoute = `${HTTPMetod} ${APIEndpoint}`;
// "GET /users" | "GET /products" | "GET /orders" | "POST /users" | ...

const rota: APIRoute = "GET /users";
// const gecersiz: APIRoute = "PATCH /users"; // HATA!

// --- 6. Type Assertion (Tip Dönüşümü) ---

const girdi: unknown = "merhaba dünya";

// as ile tip belirt
const uzunluk = (girdi as string).length;
console.log("Uzunluk:", uzunluk);

// satisfies: tipi kontrol et ama daraltma
type RenkHaritasi = Record<string, string | number[]>;

const renkler = {
  kirmizi: "#FF0000",
  yesil: [0, 255, 0],
  mavi: "#0000FF",
} satisfies RenkHaritasi;

// renkler.kirmizi hala string olarak biliniyor (daraltılmadı)
console.log(renkler.kirmizi.toUpperCase()); // çalışır!

// --- 7. Narrowing (Daraltma) Teknikleri ---

function isle(deger: string | number | boolean | null): string {
  // typeof ile daraltma
  if (typeof deger === "string") return `Metin: ${deger}`;
  if (typeof deger === "number") return `Sayı: ${deger}`;
  if (typeof deger === "boolean") return `Boolean: ${deger}`;

  // null kontrolü
  return "Değer null";
}

console.log(isle("test"));
console.log(isle(42));
console.log(isle(null));

// --- 8. Exhaustive Check (Tüketici Kontrol) ---

type Sekil =
  | { tip: "daire"; yaricap: number }
  | { tip: "kare"; kenar: number }
  | { tip: "ucgen"; taban: number; yukseklik: number };

function alanHesapla(sekil: Sekil): number {
  switch (sekil.tip) {
    case "daire":
      return Math.PI * sekil.yaricap ** 2;
    case "kare":
      return sekil.kenar ** 2;
    case "ucgen":
      return (sekil.taban * sekil.yukseklik) / 2;
    default: {
      // Eğer yeni bir Sekil tipi eklenir ama buraya case eklenmezse
      // TypeScript DERLEME HATASI verir
      const _exhaustive: never = sekil;
      return _exhaustive;
    }
  }
}

console.log("\nŞekil alanları:");
console.log("Daire:", alanHesapla({ tip: "daire", yaricap: 5 }).toFixed(2));
console.log("Kare:", alanHesapla({ tip: "kare", kenar: 4 }));
console.log("Üçgen:", alanHesapla({ tip: "ucgen", taban: 6, yukseklik: 3 }));
