// ============================================
// DERS 1: TypeScript Temel Tipler
// ============================================

// TypeScript, JavaScript'e TİP SİSTEMİ ekler.
// Bu sayede hatalar kod çalışmadan ÖNCE yakalanır.

// --- 1. Basit (Primitive) Tipler ---

// string: metin
let isim: string = "Umut";

// number: sayı (tam sayı veya ondalık)
let yas: number = 25;
let boy: number = 1.75;

// boolean: doğru/yanlış
let ogrenciMi: boolean = true;

// --- 2. Tip Çıkarımı (Type Inference) ---
// TypeScript tipi kendisi anlayabilir, her zaman yazmak zorunda değilsin

let sehir = "İstanbul"; // TypeScript bunu otomatik "string" olarak anlar
let nufus = 16000000;   // otomatik "number"

// sehir = 42; // HATA! string olan değişkene number atayamazsın

// --- 3. any ve unknown ---

// any: herhangi bir tip olabilir (TİP GÜVENLİĞİNİ KAPATIR - kaçın!)
let hersey: any = "merhaba";
hersey = 42;      // hata vermez
hersey = true;    // hata vermez

// unknown: herhangi bir tip olabilir AMA kullanmadan önce kontrol etmen gerekir
let bilinmeyen: unknown = "merhaba";
// console.log(bilinmeyen.toUpperCase()); // HATA! Önce kontrol etmen lazım
if (typeof bilinmeyen === "string") {
  console.log(bilinmeyen.toUpperCase()); // Şimdi güvenli
}

// --- 4. Array (Dizi) ---

let sayilar: number[] = [1, 2, 3, 4, 5];
let meyveler: string[] = ["elma", "armut", "portakal"];

// Alternatif yazım
let renkler: Array<string> = ["kırmızı", "mavi", "yeşil"];

// sayilar.push("altı"); // HATA! number dizisine string ekleyemezsin
sayilar.push(6); // Bu olur

// --- 5. Tuple (Sabit Uzunluklu Dizi) ---

// Her elemanın tipi ve sırası bellidir
let kisi: [string, number] = ["Umut", 25];
// kisi = [25, "Umut"]; // HATA! Sıra yanlış

// --- 6. Enum (Sabit Değerler) ---

enum Renk {
  Kirmizi = "KIRMIZI",
  Mavi = "MAVI",
  Yesil = "YESIL",
}

let favoriRenk: Renk = Renk.Mavi;
console.log(favoriRenk); // "MAVI"

// --- 7. null ve undefined ---

let bos: null = null;
let tanimsiz: undefined = undefined;

// Union type ile birleştirebilirsin
let belkiSayi: number | null = null;
belkiSayi = 42; // bu da olur

// --- 8. void: Fonksiyonun bir şey döndürmediğini belirtir ---

function selamVer(): void {
  console.log("Merhaba!");
  // return değeri yok
}

// --- 9. never: Asla gerçekleşmeyecek bir durum ---

function hataFirlat(mesaj: string): never {
  throw new Error(mesaj);
}

// --- ÇALIŞTIR ---
console.log("=== Ders 1: Temel Tipler ===");
console.log(`İsim: ${isim}, Yaş: ${yas}`);
console.log(`Şehir: ${sehir}, Nüfus: ${nufus}`);
console.log(`Meyveler: ${meyveler.join(", ")}`);
console.log(`Kişi: ${kisi[0]} - ${kisi[1]} yaşında`);
console.log(`Favori Renk: ${favoriRenk}`);
selamVer();
