// ================================================================
//  TYPESCRIPT 1 SAATTE ÖĞREN
//  Çalıştırmak için: npx tsx dersler.ts
// ================================================================
//
//  MÜFREDAT (Tahmini Süreler):
//  ─────────────────────────────
//  BÖLÜM 1: Tipler Nedir?            (10 dk)
//  BÖLÜM 2: Fonksiyonlar             (10 dk)
//  BÖLÜM 3: Nesneler ve Interface    (10 dk)
//  BÖLÜM 4: Sınıflar                 (10 dk)
//  BÖLÜM 5: Generics                 (10 dk)
//  BÖLÜM 6: Async / Await            (10 dk)
//
//  Her bölümü oku → çıktısını incele → sonraki bölüme geç.
//  Yorum satırlarındaki HATA örneklerini açarak test edebilirsin.
// ================================================================

console.log("╔══════════════════════════════════════╗");
console.log("║   TYPESCRIPT 1 SAATTE ÖĞREN         ║");
console.log("╚══════════════════════════════════════╝\n");

// ================================================================
// BÖLÜM 1: TİPLER NEDİR? (10 dk)
// ================================================================
// JavaScript'te bir değişkene istediğin değeri atarsın:
//   let x = "merhaba";  x = 42;  // JS buna izin verir
//
// TypeScript'te her değişkenin bir TİPİ vardır.
// Yanlış tip atarsan KOD ÇALIŞMADAN ÖNCE hata alırsın.
// Bu sayede bug'ları erkenden yakalarsın.
// ================================================================

console.log("── BÖLÜM 1: Tipler ──\n");

// 3 temel tip: string, number, boolean
let isim: string = "Umut";
let yas: number = 25;
let ogrenciMi: boolean = true;

console.log(`İsim: ${isim} (${typeof isim})`);
console.log(`Yaş: ${yas} (${typeof yas})`);
console.log(`Öğrenci mi: ${ogrenciMi} (${typeof ogrenciMi})`);

// ❌ Bunları açarsan HATA alırsın:
// isim = 42;          // string'e number atayamazsın
// yas = "yirmibeş";   // number'a string atayamazsın

// TypeScript tipi kendisi de anlayabilir (Tip Çıkarımı)
let sehir = "İstanbul";   // otomatik string
let nufus = 16000000;     // otomatik number
// sehir = 100;  // ❌ HATA! TypeScript bunu string olarak tanıdı

// ----- Diziler -----
let sayilar: number[] = [1, 2, 3, 4, 5];
let meyveler: string[] = ["elma", "armut", "portakal"];
// sayilar.push("altı");  // ❌ number dizisine string ekleyemezsin

console.log(`Sayılar: ${sayilar}`);
console.log(`Meyveler: ${meyveler}`);

// ----- Union Type: birden fazla tip -----
let kimlikNo: string | number;
kimlikNo = "TC12345";   // ✅ string olur
kimlikNo = 12345;       // ✅ number da olur
// kimlikNo = true;     // ❌ boolean olmaz

console.log(`Kimlik: ${kimlikNo}`);

// ----- any vs unknown -----
// any: tip kontrolünü KAPATIR → tehlikeli, kaçın
// unknown: tip kontrolü ZORLAR → güvenli
let tehlikeli: any = "merhaba";
tehlikeli = 42;  // uyarı yok, tehlikeli!

let guvenli: unknown = "merhaba";
// guvenli.toUpperCase();  // ❌ HATA! önce kontrol et
if (typeof guvenli === "string") {
  console.log(`Güvenli: ${guvenli.toUpperCase()}`); // ✅ şimdi olur
}

console.log();

// ================================================================
// BÖLÜM 2: FONKSİYONLAR (10 dk)
// ================================================================
// Fonksiyonlarda parametrelere ve dönüş değerine tip verirsin.
// Böylece yanlış parametre gönderirsen anında hata alırsın.
// ================================================================

console.log("── BÖLÜM 2: Fonksiyonlar ──\n");

// ----- Basit fonksiyon -----
function topla(a: number, b: number): number {
  return a + b;
}
console.log(`3 + 5 = ${topla(3, 5)}`);
// topla("3", 5);  // ❌ string gönderemezsin

// ----- Arrow function -----
const carp = (a: number, b: number): number => a * b;
console.log(`4 × 5 = ${carp(4, 5)}`);

// ----- Opsiyonel parametre (?) -----
function selamla(isim: string, soyisim?: string): string {
  return soyisim
    ? `Merhaba ${isim} ${soyisim}!`
    : `Merhaba ${isim}!`;
}
console.log(selamla("Umut"));
console.log(selamla("Umut", "Akarsu"));

// ----- Varsayılan değer -----
function selamlaV2(isim: string, dil = "tr"): string {
  return dil === "tr" ? `Merhaba ${isim}!` : `Hello ${isim}!`;
}
console.log(selamlaV2("Umut"));
console.log(selamlaV2("Umut", "en"));

// ----- Fonksiyon tipi -----
type Islem = (a: number, b: number) => number;

const cikar: Islem = (a, b) => a - b;
const bol: Islem = (a, b) => a / b;
console.log(`10 - 3 = ${cikar(10, 3)}`);
console.log(`20 / 4 = ${bol(20, 4)}`);

// ----- Callback -----
function diziyiDonustur(dizi: number[], islem: (n: number) => number): number[] {
  return dizi.map(islem);
}
console.log("x2:", diziyiDonustur([1, 2, 3], (n) => n * 2));
console.log("x²:", diziyiDonustur([1, 2, 3], (n) => n * n));

console.log();

// ================================================================
// BÖLÜM 3: NESNELER VE INTERFACE (10 dk)
// ================================================================
// Interface = nesnenin ŞEKLİNİ tanımlar.
// "Bu nesne şu alanlara sahip OLMALI" der.
// ================================================================

console.log("── BÖLÜM 3: Nesneler ve Interface ──\n");

// ----- Interface tanımlama -----
interface Kullanici {
  isim: string;
  yas: number;
  email: string;
  aktifMi: boolean;
}

const kullanici: Kullanici = {
  isim: "Umut",
  yas: 25,
  email: "umut@example.com",
  aktifMi: true,
};
console.log("Kullanıcı:", kullanici);

// ❌ Alan eksik bırakırsan HATA:
// const yanlis: Kullanici = { isim: "Ali" }; // yas, email, aktifMi eksik

// ----- Opsiyonel alan (?) -----
interface Urun {
  isim: string;
  fiyat: number;
  aciklama?: string; // olmasa da olur
}
const laptop: Urun = { isim: "Laptop", fiyat: 25000 };
const telefon: Urun = { isim: "Telefon", fiyat: 15000, aciklama: "Son model" };
console.log("Laptop:", laptop);
console.log("Telefon:", telefon);

// ----- readonly: değiştirilemez alan -----
interface Ayarlar {
  readonly apiUrl: string;
  readonly port: number;
}
const ayarlar: Ayarlar = { apiUrl: "localhost", port: 3000 };
// ayarlar.port = 4000;  // ❌ readonly değiştirilemez

// ----- type ile union: sabit değerler -----
type Durum = "bekliyor" | "islemde" | "tamamlandi";

let siparis: Durum = "bekliyor";
siparis = "tamamlandi";
// siparis = "iptal";  // ❌ listede yok

console.log(`Sipariş durumu: ${siparis}`);

// ----- extends: interface genişletme -----
interface Hayvan {
  isim: string;
  yas: number;
}

interface Kedi extends Hayvan {
  cinsi: string;
}

const kedi: Kedi = { isim: "Boncuk", yas: 3, cinsi: "Tekir" };
console.log("Kedi:", kedi);

// ----- Intersection: iki tipi birleştir -----
type Adres = { sehir: string; ilce: string };
type Iletisim = { telefon: string; email: string };
type KisiDetay = Adres & Iletisim;

const detay: KisiDetay = {
  sehir: "İstanbul",
  ilce: "Kadıköy",
  telefon: "555-1234",
  email: "a@b.com",
};
console.log("Detay:", detay);

console.log();

// ================================================================
// BÖLÜM 4: SINIFLAR (10 dk)
// ================================================================
// Sınıf = veri + davranış bir arada.
// public / private / protected erişim kontrolü sağlar.
// ================================================================

console.log("── BÖLÜM 4: Sınıflar ──\n");

// ----- Basit sınıf -----
class Araba {
  // constructor'da public/private yazınca alan otomatik oluşur
  constructor(
    public marka: string,
    public model: string,
    private _hiz: number = 0,
  ) {}

  hizlan(miktar: number): void {
    this._hiz += miktar;
  }

  frenYap(miktar: number): void {
    this._hiz = Math.max(0, this._hiz - miktar);
  }

  get hiz(): number {
    return this._hiz;
  }

  durum(): string {
    return `${this.marka} ${this.model} → ${this._hiz} km/h`;
  }
}

const araba = new Araba("Toyota", "Corolla");
araba.hizlan(80);
araba.frenYap(20);
console.log(araba.durum());
// araba._hiz = 999;  // ❌ private alana dışarıdan erişilemez

// ----- Kalıtım (extends) -----
class ElektrikliAraba extends Araba {
  constructor(
    marka: string,
    model: string,
    public sarjYuzdesi: number = 100,
  ) {
    super(marka, model); // üst sınıfın constructor'ını çağır
  }

  hizlan(miktar: number): void {
    if (this.sarjYuzdesi <= 0) {
      console.log("Şarj bitti!");
      return;
    }
    super.hizlan(miktar);
    this.sarjYuzdesi -= miktar * 0.5;
  }

  override durum(): string {
    return `${super.durum()} | Şarj: %${this.sarjYuzdesi.toFixed(0)}`;
  }
}

const tesla = new ElektrikliAraba("Tesla", "Model 3");
tesla.hizlan(60);
tesla.hizlan(40);
console.log(tesla.durum());

// ----- Abstract sınıf: doğrudan oluşturulamaz -----
abstract class Sekil {
  abstract alan(): number;
  abstract cevre(): number;

  ozet(): string {
    return `Alan: ${this.alan().toFixed(1)}, Çevre: ${this.cevre().toFixed(1)}`;
  }
}

class Dikdortgen extends Sekil {
  constructor(private en: number, private boy: number) { super(); }
  alan(): number { return this.en * this.boy; }
  cevre(): number { return 2 * (this.en + this.boy); }
}

class Daire extends Sekil {
  constructor(private r: number) { super(); }
  alan(): number { return Math.PI * this.r ** 2; }
  cevre(): number { return 2 * Math.PI * this.r; }
}

// const s = new Sekil();  // ❌ abstract sınıf oluşturulamaz
console.log("Dikdörtgen 5x3:", new Dikdortgen(5, 3).ozet());
console.log("Daire r=4:", new Daire(4).ozet());

// ----- Interface implement etme -----
interface Kayitli {
  kaydet(): void;
}

class Not implements Kayitli {
  constructor(public baslik: string, public icerik: string) {}
  kaydet(): void {
    console.log(`"${this.baslik}" kaydedildi.`);
  }
}

new Not("TS Notu", "Sınıflar harika!").kaydet();

console.log();

// ================================================================
// BÖLÜM 5: GENERICS (10 dk)
// ================================================================
// Generic = TİPİ PARAMETRİK yapmak.
// Aynı kodu number, string, veya kendi tipinle kullanabilirsin.
// <T> diye yazılan şey bir "tip değişkeni".
// ================================================================

console.log("── BÖLÜM 5: Generics ──\n");

// ----- Neden generic? -----
// Generic OLMADAN: her tip için ayrı fonksiyon
// function ilkSayiyiAl(dizi: number[]): number { ... }
// function ilkMetniAl(dizi: string[]): string { ... }

// Generic İLE: tek fonksiyon, tüm tipler
function ilkEleman<T>(dizi: T[]): T | undefined {
  return dizi[0];
}

console.log("İlk sayı:", ilkEleman([10, 20, 30]));
console.log("İlk metin:", ilkEleman(["a", "b", "c"]));

// ----- Generic interface -----
interface Kutu<T> {
  icerik: T;
  etiket: string;
}

const sayiKutusu: Kutu<number> = { icerik: 42, etiket: "sayı" };
const metinKutusu: Kutu<string> = { icerik: "merhaba", etiket: "metin" };
console.log("Kutu:", sayiKutusu, metinKutusu);

// ----- Generic kısıtlama (extends) -----
interface Uzunluklu {
  length: number;
}

function uzunlukYaz<T extends Uzunluklu>(deger: T): void {
  console.log(`"${deger}" → uzunluk: ${deger.length}`);
}

uzunlukYaz("merhaba");  // string'in length'i var ✅
uzunlukYaz([1, 2, 3]);  // array'in length'i var ✅
// uzunlukYaz(42);       // ❌ number'ın length'i yok

// ----- Utility Types (hazır generic tipler) -----
interface Gorev {
  baslik: string;
  aciklama: string;
  bitti: boolean;
}

// Partial: tüm alanları opsiyonel yapar
const guncelleme: Partial<Gorev> = { bitti: true };

// Pick: sadece istediğin alanları al
const ozet: Pick<Gorev, "baslik" | "bitti"> = { baslik: "TS öğren", bitti: false };

// Omit: istediğin alanları çıkar
const yeniGorev: Omit<Gorev, "bitti"> = { baslik: "Kod yaz", aciklama: "TS ile" };

// Record: anahtar-değer haritası
const notlar: Record<string, number> = { matematik: 90, fizik: 85 };

console.log("Partial:", guncelleme);
console.log("Pick:", ozet);
console.log("Omit:", yeniGorev);
console.log("Record:", notlar);

console.log();

// ================================================================
// BÖLÜM 6: ASYNC / AWAIT (10 dk)
// ================================================================
// Promise = "Gelecekte bir değer vereceğim" sözü.
// async/await = Promise'leri kolay yazmak için.
// API çağrıları, dosya okuma gibi işlemler asenkrondur.
// ================================================================

console.log("── BÖLÜM 6: Async / Await ──\n");

// ----- Yardımcı: bekleme fonksiyonu -----
function bekle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----- async fonksiyon: her zaman Promise döner -----
async function veriGetir(id: number): Promise<string> {
  await bekle(100); // 100ms bekle (API simülasyonu)
  return `Kullanıcı #${id}`;
}

// ----- Hata yakalama: try/catch -----
async function guvenliGetir(id: number): Promise<string> {
  try {
    if (id < 0) throw new Error("Geçersiz ID");
    return await veriGetir(id);
  } catch (hata) {
    if (hata instanceof Error) return `Hata: ${hata.message}`;
    return "Bilinmeyen hata";
  }
}

// ----- Promise.all: paralel çalıştır -----
async function cokluGetir(): Promise<void> {
  const baslangic = Date.now();

  // 3 istek AYNI ANDA başlar
  const [k1, k2, k3] = await Promise.all([
    veriGetir(1),
    veriGetir(2),
    veriGetir(3),
  ]);

  const sure = Date.now() - baslangic;
  console.log(`Paralel sonuç (${sure}ms): ${k1}, ${k2}, ${k3}`);
}

// ----- Tipli async: gerçek dünya örneği -----
interface KullaniciBilgi {
  id: number;
  isim: string;
  email: string;
}

async function kullaniciGetir(id: number): Promise<KullaniciBilgi> {
  await bekle(50);
  return { id, isim: `Kişi ${id}`, email: `kisi${id}@mail.com` };
}

// ----- Ana fonksiyon -----
async function main(): Promise<void> {
  // Tekli çağrı
  const sonuc = await veriGetir(1);
  console.log(sonuc);

  // Hata yakalama
  console.log(await guvenliGetir(-1));

  // Paralel
  await cokluGetir();

  // Tipli
  const kullanici2 = await kullaniciGetir(42);
  console.log("Kullanıcı:", kullanici2);

  console.log();
  console.log("════════════════════════════════════════");
  console.log("  TEBRİKLER! TypeScript temellerini");
  console.log("  öğrendin. Şimdi yapman gerekenler:");
  console.log("────────────────────────────────────────");
  console.log("  1. Bu dosyadaki kodları değiştir,");
  console.log("     tekrar çalıştır, ne olduğunu gör.");
  console.log("  2. ❌ işaretli satırları aç,");
  console.log("     hataları kendin gör.");
  console.log("  3. Kendi interface ve sınıflarını yaz.");
  console.log("════════════════════════════════════════");
}

main();
