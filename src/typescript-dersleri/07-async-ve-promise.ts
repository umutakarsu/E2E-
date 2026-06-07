// ============================================
// DERS 7: Async/Await ve Promise
// ============================================

// --- 1. Promise Nedir? ---

// Promise: "Gelecekte bir değer vereceğim" sözü
// 3 durumu var: pending (bekliyor), fulfilled (başarılı), rejected (başarısız)

function bekle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- 2. Promise Oluşturma ---

function rastgeleSayiUret(): Promise<number> {
  return new Promise((resolve, reject) => {
    const sayi = Math.random();
    if (sayi > 0.1) {
      resolve(sayi);
    } else {
      reject(new Error("Çok küçük sayı çıktı!"));
    }
  });
}

// --- 3. Async/Await ---

// async fonksiyon her zaman Promise döner
async function veriGetir(id: number): Promise<string> {
  // await: Promise'in çözülmesini bekle
  await bekle(100);
  return `Kullanıcı #${id} verisi`;
}

// --- 4. Hata Yakalama ---

async function guvenliGetir(): Promise<string> {
  try {
    const sonuc = await rastgeleSayiUret();
    return `Başarılı: ${sonuc}`;
  } catch (hata) {
    if (hata instanceof Error) {
      return `Hata yakalandı: ${hata.message}`;
    }
    return "Bilinmeyen hata";
  }
}

// --- 5. Paralel İşlemler ---

async function parallelIslemler(): Promise<void> {
  console.log("Paralel işlemler başlıyor...");
  const baslangic = Date.now();

  // Promise.all: Hepsi aynı anda başlar, hepsi bitince devam eder
  const [sonuc1, sonuc2, sonuc3] = await Promise.all([
    veriGetir(1),
    veriGetir(2),
    veriGetir(3),
  ]);

  const sure = Date.now() - baslangic;
  console.log(`Sonuçlar (${sure}ms):`, sonuc1, sonuc2, sonuc3);
}

// --- 6. Promise.race ve Promise.any ---

async function yarisOrnek(): Promise<void> {
  // race: İlk biten (başarılı VEYA başarısız) kazanır
  const ilkBiten = await Promise.race([
    bekle(100).then(() => "hızlı"),
    bekle(200).then(() => "yavaş"),
  ]);
  console.log("Yarış kazananı:", ilkBiten);
}

// --- 7. Tipli Async Fonksiyonlar ---

interface Kullanici {
  id: number;
  isim: string;
  email: string;
}

// API simülasyonu
async function kullaniciGetir(id: number): Promise<Kullanici> {
  await bekle(50);
  return {
    id,
    isim: `Kullanıcı ${id}`,
    email: `user${id}@example.com`,
  };
}

async function tumKullanicilariGetir(idler: number[]): Promise<Kullanici[]> {
  const vaatler = idler.map((id) => kullaniciGetir(id));
  return Promise.all(vaatler);
}

// --- 8. Async Generator (İleri Seviye) ---

async function* sayiUret(baslangic: number, bitis: number) {
  for (let i = baslangic; i <= bitis; i++) {
    await bekle(50);
    yield i;
  }
}

// --- 9. Retry Pattern (Tekrar Deneme) ---

async function tekrarDene<T>(
  islem: () => Promise<T>,
  maxDeneme: number = 3,
): Promise<T> {
  for (let deneme = 1; deneme <= maxDeneme; deneme++) {
    try {
      return await islem();
    } catch (hata) {
      console.log(`Deneme ${deneme}/${maxDeneme} başarısız`);
      if (deneme === maxDeneme) throw hata;
      await bekle(deneme * 100); // exponential backoff
    }
  }
  throw new Error("Beklenmeyen hata");
}

// --- ÇALIŞTIR ---
async function main(): Promise<void> {
  console.log("=== Ders 7: Async/Await ===\n");

  // Basit async
  const veri = await veriGetir(1);
  console.log(veri);

  // Hata yakalama
  const sonuc = await guvenliGetir();
  console.log(sonuc);

  // Paralel
  await parallelIslemler();

  // Yarış
  await yarisOrnek();

  // Kullanıcılar
  const kullanicilar = await tumKullanicilariGetir([1, 2, 3]);
  console.log("\nKullanıcılar:", kullanicilar);

  // Async generator
  console.log("\nSayı üretici:");
  for await (const sayi of sayiUret(1, 5)) {
    process.stdout.write(`${sayi} `);
  }
  console.log();

  // Retry
  console.log("\nRetry pattern:");
  try {
    await tekrarDene(() => rastgeleSayiUret());
    console.log("Başarılı!");
  } catch {
    console.log("Tüm denemeler başarısız");
  }
}

main();
