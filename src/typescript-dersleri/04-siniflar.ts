// ============================================
// DERS 4: Sınıflar (Classes)
// ============================================

// --- 1. Basit Sınıf ---

class Hayvan {
  isim: string;
  yas: number;

  constructor(isim: string, yas: number) {
    this.isim = isim;
    this.yas = yas;
  }

  sesCikar(): string {
    return `${this.isim} ses çıkarıyor!`;
  }
}

const hayvan = new Hayvan("Rex", 5);
console.log(hayvan.sesCikar());

// --- 2. Kısa Constructor Yazımı ---

// TypeScript'te constructor parametrelerine erişim belirteci ekleyerek
// alanları otomatik tanımlayabilirsin
class Araba {
  constructor(
    public marka: string,
    public model: string,
    private _hiz: number = 0,
  ) {}

  hizlan(miktar: number): void {
    this._hiz += miktar;
    console.log(`${this.marka} ${this.model}: ${this._hiz} km/h`);
  }

  get hiz(): number {
    return this._hiz;
  }
}

const araba = new Araba("Toyota", "Corolla");
araba.hizlan(60);
araba.hizlan(30);
console.log("Mevcut hız:", araba.hiz);
// araba._hiz = 200; // HATA! private alana dışarıdan erişilemez

// --- 3. Erişim Belirteçleri ---

class BankaHesabi {
  public sahibi: string;        // her yerden erişilebilir
  private _bakiye: number;      // sadece sınıf içinden
  protected _hesapNo: string;   // sınıf ve alt sınıflardan

  constructor(sahibi: string, bakiye: number) {
    this.sahibi = sahibi;
    this._bakiye = bakiye;
    this._hesapNo = Math.random().toString(36).substring(2, 10);
  }

  paraYatir(miktar: number): void {
    if (miktar <= 0) throw new Error("Miktar pozitif olmalı");
    this._bakiye += miktar;
    console.log(`+${miktar} TL yatırıldı. Bakiye: ${this._bakiye} TL`);
  }

  paraCek(miktar: number): void {
    if (miktar > this._bakiye) throw new Error("Yetersiz bakiye");
    this._bakiye -= miktar;
    console.log(`-${miktar} TL çekildi. Bakiye: ${this._bakiye} TL`);
  }

  get bakiye(): number {
    return this._bakiye;
  }
}

// --- 4. Kalıtım (Inheritance) ---

class VadeliHesap extends BankaHesabi {
  constructor(
    sahibi: string,
    bakiye: number,
    private faizOrani: number,
  ) {
    super(sahibi, bakiye); // üst sınıfın constructor'ını çağır
  }

  faizUygula(): void {
    const faiz = this.bakiye * this.faizOrani;
    this.paraYatir(faiz);
    console.log(`Faiz uygulandı: +${faiz.toFixed(2)} TL`);
  }

  hesapBilgisi(): string {
    // protected alana alt sınıftan erişebilirsin
    return `Hesap No: ${this._hesapNo}, Sahip: ${this.sahibi}`;
  }
}

// --- 5. Abstract Sınıflar ---

// Doğrudan oluşturulamaz, sadece kalıtım için kullanılır
abstract class Sekil {
  abstract alan(): number;       // alt sınıf ZORUNLU implement etmeli
  abstract cevre(): number;

  bilgiVer(): string {
    return `Alan: ${this.alan().toFixed(2)}, Çevre: ${this.cevre().toFixed(2)}`;
  }
}

class Dikdortgen extends Sekil {
  constructor(
    private genislik: number,
    private yukseklik: number,
  ) {
    super();
  }

  alan(): number {
    return this.genislik * this.yukseklik;
  }

  cevre(): number {
    return 2 * (this.genislik + this.yukseklik);
  }
}

class Daire extends Sekil {
  constructor(private yaricap: number) {
    super();
  }

  alan(): number {
    return Math.PI * this.yaricap ** 2;
  }

  cevre(): number {
    return 2 * Math.PI * this.yaricap;
  }
}

// --- 6. Interface Implementation ---

interface Yazdirilabilir {
  yazdir(): string;
}

interface Kaydedilebilir {
  kaydet(): void;
}

class Belge implements Yazdirilabilir, Kaydedilebilir {
  constructor(
    public baslik: string,
    public icerik: string,
  ) {}

  yazdir(): string {
    return `[${this.baslik}]\n${this.icerik}`;
  }

  kaydet(): void {
    console.log(`"${this.baslik}" kaydedildi.`);
  }
}

// --- ÇALIŞTIR ---
console.log("=== Ders 4: Sınıflar ===\n");

const hesap = new VadeliHesap("Umut", 10000, 0.15);
hesap.paraYatir(5000);
hesap.faizUygula();
console.log(hesap.hesapBilgisi());
console.log();

const dikdortgen = new Dikdortgen(5, 3);
const daire = new Daire(4);
console.log("Dikdörtgen:", dikdortgen.bilgiVer());
console.log("Daire:", daire.bilgiVer());
console.log();

const belge = new Belge("TypeScript Notları", "Sınıflar çok güçlü!");
console.log(belge.yazdir());
belge.kaydet();
