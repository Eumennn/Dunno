// Dunno pozları: content/art/dunno_reference_poses.webp'ye göre elle yerleştirilmiş 32x32 haritalar.
// Gövde siluetleri satır aralıklarıyla (y: [sol, sağ]), yüz/kol/tüy vb. harf damgalarıyla çizilir.
import { Grid } from "./grid.mjs";

// ------------------------------------------------------------------ siluetler

/** Önden gövde: yumurta/armut; üst dar, yanlar yuvarlak, alt geniş (köşeler 2-3 adım merdiven). */
const FRONT = {
  7: [13, 18], 8: [11, 20], 9: [9, 22], 10: [8, 23], 11: [7, 24], 12: [6, 25], 13: [5, 26], 14: [5, 26],
  15: [4, 27], 16: [4, 27], 17: [3, 28], 18: [3, 28], 19: [3, 28], 20: [3, 28], 21: [3, 28], 22: [3, 28],
  23: [3, 28], 24: [3, 28], 25: [4, 27], 26: [4, 27], 27: [5, 26], 28: [7, 24],
};
/** Üstte geniş krem yüz maskesi + ayrı krem karın lekesi (arada turuncu). */
const FACE = { 12: [11, 20], 13: [9, 22], 14: [8, 23], 15: [7, 24], 16: [7, 24], 17: [7, 24], 18: [8, 23], 19: [10, 21] };
const BELLY = { 22: [12, 19], 23: [10, 21], 24: [10, 21], 25: [10, 21], 26: [11, 20], 27: [12, 19] };

/** Yandan (yürüme/koşma), sağa bakar. */
const SIDE = {
  8: [12, 20], 9: [10, 22], 10: [8, 24], 11: [7, 25], 12: [6, 26], 13: [5, 27], 14: [5, 27], 15: [4, 28],
  16: [4, 28], 17: [4, 28], 18: [4, 28], 19: [4, 28], 20: [4, 28], 21: [4, 28], 22: [4, 28], 23: [4, 28],
  24: [5, 28], 25: [5, 27], 26: [6, 27], 27: [8, 25],
};
const SIDE_FACE = { 13: [18, 25], 14: [16, 27], 15: [15, 27], 16: [15, 27], 17: [15, 27], 18: [16, 26], 19: [18, 25] };
const SIDE_BELLY = { 22: [17, 25], 23: [16, 26], 24: [17, 26], 25: [18, 25] };

/** Uyku: yere yayılmış, yayvan. */
const FLAT = {
  18: [10, 22], 19: [7, 25], 20: [5, 27], 21: [3, 28], 22: [2, 29], 23: [1, 30], 24: [1, 30], 25: [1, 30],
  26: [1, 30], 27: [2, 29], 28: [4, 27],
};
const FLAT_FACE = { 22: [13, 27], 23: [12, 28], 24: [12, 28], 25: [12, 28], 26: [13, 27] };

// ------------------------------------------------------------------ parçalar

/** Sol üst ışık parlaması (#FFD29A). */
const SHINE = [".LL", "LLL", "L.."];

/** Yarı kapalı uykulu göz: kapak + aşağı sarkan göz bebeği. */
const EYE = ["KKKK", ".KK."];
const EYE_CLOSED = ["....", "KKKK"];
/** Uyku gözü: aşağı kıvrık çizgi. */
const EYE_SLEEP = ["K..K", ".KK."];
const CHEEK = ["PP"];

/** Yanda küçük kol + el kıvrımı (sol taraf; sağ için ayna). Referans poz 1. */
const ARM = ["..KK", ".KOK", "KOK.", "KOK.", ".KOK", "..KK"];
/** Kollar yukarı/yana (shrug, dragged). */
const ARM_UP = ["KK....", "KOK...", ".KOK..", "..KOK.", "...KOK", "....KO"];
const ARM_SIDE = ["KK", "KOK", ".KK"];
/** Ayaklar. */
const FOOT = ["KSSSK", ".KKK."];
const FOOT_DANGLE = ["KSK", "KSK", ".K."];
const FOOT_STEP = ["KSSK", "KKK."];

/** shh: ağzın önünde dikey parmak, altında el (turuncu). */
const FINGER = ["..K...", ".KOK..", ".KOK..", ".KOK..", ".KOKK.", "KOOOOK", "KSOOSK", ".KKKK."];

/** Ağız. */
const MOUTH_CLOSED = ["KK"];
const MOUTH_OPEN = [".KK.", "KPPK", ".KK."];
const MOUTH_HALF = ["KKK"];
/** SPEC 17 esneme: büyük açık ağız */
const MOUTH_YAWN = [".KKK.", "KPPPK", "KPPPK", ".KKK."];

/** zzz, ter damlası (yuvarlak), hız çizgileri. */
const Z = ["BBBB", "..B.", ".B..", "BBBB"];
const Z_SMALL = ["BBB", ".B.", "BBB"];
const DROP = [".BB.", "BBBB", "BBBB", ".BB."];
const DROP_SMALL = ["BB", "BB"];
const SPEED = ["KK.K", "....", ".KK.K"];

// ------------------------------------------------------------------ tüy (tek ince tel; yukarı çıkıp sağa kıvrılır, ucu aşağı)

const ANTENNA = {
  up: [[15, 7], [15, 6], [15, 5], [14, 4], [14, 3], [15, 2], [16, 1], [17, 1], [18, 1], [19, 2], [20, 3], [20, 4]],
  sway: [[15, 7], [15, 6], [15, 5], [15, 4], [15, 3], [16, 2], [17, 2], [18, 2], [19, 3], [20, 4], [20, 5]],
  droop: [[15, 7], [15, 6], [16, 5], [17, 4], [18, 4], [19, 5], [20, 6], [20, 7]],
};

function antenna(g, variant, dx = 0, dy = 0) {
  return g.strand(ANTENNA[variant].map(([x, y]) => [x + dx, y + dy]));
}

// ------------------------------------------------------------------ pozlar

/**
 * Önden Dunno. opts: eyes (open|closed|none), arms (side|up|none), ant, mouth, feet (stand|dangle), face, finger.
 */
export function front(opts = {}) {
  const { eyes = "open", arms = "side", ant = "up", mouth = null, feet = "stand", face = true, finger = false } = opts;
  const g = new Grid();
  antenna(g, ant);
  if (feet === "stand") g.stamp(FOOT, 7, 28).stamp(FOOT, 20, 28);
  else g.stamp(FOOT_DANGLE, 8, 28).stamp(FOOT_DANGLE, 21, 28);
  g.body(FRONT);
  g.stamp(SHINE, 10, 9);
  if (face) {
    g.fill(FACE, "C").fill(BELLY, "C");
    const eye = eyes === "closed" ? EYE_CLOSED : EYE;
    if (eyes !== "none") g.stamp(eye, 10, 15).stamp(eye, 18, 15);
    g.stamp(CHEEK, 7, 17).stamp(CHEEK, 23, 17);
    if (mouth === "open") g.stamp(MOUTH_OPEN, 14, 18);
    else if (mouth === "yawn") g.stamp(MOUTH_YAWN, 13, 18);
    else if (mouth === "half") g.stamp(MOUTH_HALF, 14, 19);
    else if (mouth === "closed") g.stamp(MOUTH_CLOSED, 15, 19);
    if (finger) g.stamp(FINGER, 13, 15);
  }
  if (arms === "side") g.stamp(ARM, 0, 18).stamp(ARM, 28, 18, { mirror: true });
  if (arms === "up") g.stamp(ARM_UP, 0, 12).stamp(ARM_UP, 26, 12, { mirror: true });
  // SPEC 17 el sallama: sol kol yanda, sağ kol yukarıda (wave 0/1 el bir piksel aşağı/yukarı)
  if (arms === "wave0" || arms === "wave1") g.stamp(ARM, 0, 18).stamp(ARM_UP, 26, arms === "wave0" ? 12 : 11, { mirror: true });
  // bağlantı noktaları (WR2a): baş üstü ortası, tüy dibi, gözlerin ortası, kulaklık hattı; boyun (SPEC 09 K6: yüz ile karın arası)
  g.mark("head", 16, 7).mark("antenna", 15, 7).mark("ears", 16, 15).mark("neck", 16, 20);
  if (face && eyes !== "none") g.mark("eyes", 16, 15);
  else g.hide("eyes", face ? "eyes not drawn" : "no face");
  return g;
}

/** Arkadan (sulk): yüz yok, gövde düz turuncu, kollar yanda. */
export function back({ ant = "up" } = {}) {
  const g = new Grid();
  antenna(g, ant);
  g.stamp(FOOT, 7, 28).stamp(FOOT, 20, 28);
  g.body(FRONT);
  g.stamp(SHINE, 10, 9);
  g.stamp(ARM, 0, 18).stamp(ARM, 28, 18, { mirror: true });
  g.mark("head", 16, 7).mark("antenna", 15, 7).mark("ears", 16, 15).mark("neck", 16, 20).hide("eyes", "back view");
  return g;
}

/**
 * Yandan, sağa bakar. step: 0 (ayaklar yan yana), 1 (ön ayak ileride, arka ayak havada), 2 (ayaklar geçerken).
 * run: öne eğik gövde + ter damlaları + hız çizgileri.
 */
export function side({ step = 0, ant = "up", eyes = "open", run = false, drops = 0 } = {}) {
  const g = new Grid();
  antenna(g, ant, 1, 1);
  const feet = [
    [[8, 27, FOOT], [20, 27, FOOT]],
    [[3, 26, FOOT_STEP], [24, 27, FOOT_STEP]],
    [[11, 27, FOOT_STEP], [16, 27, FOOT_STEP]],
  ][step];
  for (const [x, y, map] of feet) g.stamp(map, x, y);
  g.body(SIDE);
  g.stamp(SHINE, 10, 10);
  g.fill(SIDE_FACE, "C").fill(SIDE_BELLY, "C");
  const eye = eyes === "closed" ? EYE_CLOSED : EYE;
  g.stamp(eye, 17, 15).stamp(eye, 23, 15);
  g.stamp(CHEEK, 15, 17).stamp(["P"], 27, 17);
  g.stamp(ARM_SIDE, 2, 19 + (step === 1 ? 1 : 0));
  // yandan: boyun gövde ortasına yakın (atkı/pelerin yandan da gövdede kalır, SPEC 09 K6); tüy (1,1) kaydırılmış; gözler sağda (profil). Kulaklık kafanın ortasında (SPEC 09 K1: eskiden 12, gövdeden taşıyordu;
  // ölçüm src/wardrobe/measure.ts, test scripts/fit.test.ts)
  g.mark("head", 16, 8).mark("antenna", 16, 8).mark("eyes", 22, 15).mark("ears", 16, 15).mark("neck", 18, 20);
  if (run) {
    g.lean([[12, 2], [19, 1]]);
    // kulak noktası eğik kafanın tepesiyle aynı x (kulaklık bandı kafaya oturur; lean kulak satırını 1 kaydırıyor)
    g.mark("ears", 16 + 2, 15);
    g.stamp(SPEED, 0, 22 + (step === 1 ? 1 : 0));
    g.stamp(DROP, 2, 6 - drops).stamp(DROP_SMALL, 7, 3 - drops);
  }
  return g;
}

/** Uyku: yayvan, kapalı göz, tüy yana yatık kıvrık tel, zzz. z: 0..3 animasyon adımı. */
export function sleep({ z = 0, breath = false } = {}) {
  const g = new Grid();
  g.strand([[21, 17], [22, 16], [23, 15], [24, 15], [25, 15], [26, 16], [27, 17], [28, 18]]);
  g.stamp(["KSSSSK", ".KKKK."], 4, 28).stamp(["KSSSSK", ".KKKK."], 21, 28);
  g.body(FLAT);
  g.stamp(SHINE, 9, 19);
  g.fill(FLAT_FACE, "C");
  g.stamp(EYE_SLEEP, 15, 23).stamp(EYE_SLEEP, 22, 23);
  g.stamp(CHEEK, 13, 25).stamp(CHEEK, 26, 25);
  const zs = [
    [[24, 9, Z_SMALL]],
    [[24, 8, Z_SMALL], [27, 3, Z_SMALL]],
    [[24, 7, Z_SMALL], [27, 2, Z]],
    [[27, 1, Z]],
  ][z];
  for (const [x, y, map] of zs) g.stamp(map, x, y);
  // yayvan gövde: baş üstü daha aşağıda, tüy sağa yatık, kapalı gözler sağda
  g.mark("head", 16, 18).mark("antenna", 21, 17).mark("eyes", 20, 23).mark("ears", 16, 22).mark("neck", 16, 25);
  if (breath) g.breathe(22);
  return g;
}

/** Kenarın arkasından bakar: önden gövde sağa itilmiş, kenar çizgisi x=wall. out: dışarı çıkma (0-1 px). */
export function peek({ out = 0, eyes = "open", ant = "up" } = {}) {
  const g = front({ eyes, ant, arms: "none", feet: "stand" });
  g.shift(7 - out, 0);
  const wall = 26;
  g.clipRight(wall);
  g.stamp(["KO", "KO", "K."], wall - 2, 19); // kenarı tutan el
  for (let y = 0; y < 32; y++) g.set(wall, y, "K");
  return g;
}

/** Logo: yarım kafa (tüy + gözler), alt kenar düz. İkonlar için. */
// ------------------------------------------------------------------ osurma (SPEC 09 K3, K3c cilası)

/**
 * Arkadan çıkan piksel bulutlar: 1 px --ink (K) kontur, içi L (#FFD29A) / S (#D9774A); yarı saydam yok.
 * Krem zeminde konturla seçilir (K3c: konturusuz açık turuncu kayboluyordu).
 */
const PUFF_XS = [".K.", "KLK", ".K."];
const PUFF_S = [".KKK.", "KLLLK", "KLSLK", ".KKK."];
const PUFF_M = [".KKKKK.", "KLLLLLK", "KLSSSLK", "KLLLLLK", ".KKKKK."];
const PUFF_L = ["..KKKKK..", ".KLLLLLK.", "KLLSSSLLK", "KLSSSSSLK", "KLLSSSLLK", ".KLLLLLK.", "..KKKKK.."];

/**
 * Bulut gövdenin arkasında: boş piksele ve kolun üstüne çizilir (kol gövdenin yanında, bulut onu örtebilir), gövdeye/ayağa çizilmez.
 * dx, dy: karenin kayması (kol damgası onunla birlikte kayar: ARM (0, 18), 4x6).
 */
function puff(g, rows, x0, y0, dx = 0, dy = 0) {
  const onArm = (x, y) => x >= dx && x <= dx + 3 && y >= 18 + dy && y <= 23 + dy;
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      const x = x0 + i;
      const y = y0 + j;
      if (c !== "." && (g.get(x, y) === "." || onArm(x, y))) g.set(x, y, c);
    }),
  );
  return g;
}

/** Çömelme: gövde 1 px aşağı + üst kısım 1 px basık (kafa 2 px iner, gövde daha yayvan görünür). */
const squat = (g, dx) => g.shift(dx, 1).breathe(17);

/**
 * Osurma, 6 kare (one-shot): 0 normal, 1 çömelme, 2 çömelme + titreme + küçük puf, 3 titreme + iki puf (küçük -> orta, gözler kapalı),
 * 4 titreme + en büyük bulut (9x7) + küçük puf, 5 dağılan iki küçük puf + utangaç yüz. Bulut gövdenin solunda/arkasında, alçakta;
 * gövde 1-2 px sağa kayar (yer açılır), noktalar pikselle birlikte kayar. Aynada bulut öbür yana geçer.
 */
export function fart(n) {
  switch (n) {
    case 0:
      return front();
    case 1:
      return squat(front(), 1);
    case 2:
      return puff(squat(front(), 2), PUFF_S, 0, 26, 2, 1);
    case 3:
      return puff(puff(squat(front({ eyes: "closed" }), 1), PUFF_M, 0, 25, 1, 1), PUFF_XS, 1, 21, 1, 1);
    case 4:
      return puff(puff(squat(front({ eyes: "closed" }), 2), PUFF_L, 0, 24, 2, 1), PUFF_S, 0, 18, 2, 1);
    default:
      return puff(puff(front({ eyes: "closed", mouth: "half" }).shift(1, 0), PUFF_XS, 0, 14, 1, 0), PUFF_XS, 2, 19, 1, 0);
  }
}

// ------------------------------------------------------------------ SPEC 17 eğlenceli animasyonlar (placeholder, tasarımcı onayı bekler)

/** El sallama, 4 kare (tek seferlik): selam / görüşürüz / karşılama. */
export function wave(n) {
  return n === 0 ? front({ mouth: "half" }) : front({ arms: n % 2 ? "wave1" : "wave0", mouth: n === 2 ? "open" : "half" });
}

/** Zıplama, 4 kare (tek seferlik): çömel, kollar yukarı (sprite yerinde; havalanma controller'da pencere kayması). */
export function jump(n) {
  switch (n) {
    case 0:
      return squat(front(), 0);
    case 1:
      return front({ arms: "up", mouth: "open", feet: "dangle" });
    case 2:
      return front({ arms: "up", mouth: "open", feet: "dangle", ant: "sway" });
    default:
      return squat(front({ mouth: "half" }), 0);
  }
}

/** Dans, 8 kare (tek seferlik ~1.6 sn): sağa sola sallanır, kollar sırayla yukarı, tüy sallanır. */
export function dance(n) {
  const side = n % 4 < 2 ? -1 : 1;
  const up = n % 2 === 0;
  const g = front({ arms: up ? "up" : "side", mouth: n % 4 === 1 ? "open" : "half", eyes: n === 3 || n === 7 ? "closed" : "open", ant: n % 2 ? "sway" : "up" });
  // sola kaydırma kuyruklu kostümleri karenin dışına iterdi: sadece sağa (0 / 1 px)
  g.shift(side > 0 ? 1 : 0, 0);
  return up ? g : g.breathe(20);
}

/** Esneme, 5 kare (tek seferlik): gözler kapanır, ağız kocaman, kollar gerinir, toparlanır. */
export function yawn(n) {
  switch (n) {
    case 0:
      return front({ eyes: "closed", mouth: "half" });
    case 1:
      return front({ eyes: "closed", mouth: "yawn", arms: "up" });
    case 2:
      return front({ eyes: "closed", mouth: "yawn", arms: "up", ant: "sway" }).breathe(20);
    case 3:
      return front({ eyes: "closed", mouth: "half", ant: "droop" });
    default:
      return front();
  }
}

/** Hapşırma, 6 kare (tek seferlik): a... a... (geriye), hapşu (öne + küçük bulut), toparlan. */
export function sneeze(n) {
  switch (n) {
    case 0:
      return front({ mouth: "half" });
    case 1:
      return front({ mouth: "open" }).breathe(20);
    case 2:
      return front({ mouth: "open", eyes: "closed", ant: "sway" }).breathe(20);
    case 3:
      return puff(front({ mouth: "open", eyes: "closed", ant: "droop" }).shift(0, 1), PUFF_S, 26, 10, 0, 1);
    case 4:
      return puff(front({ eyes: "closed", mouth: "half" }), PUFF_XS, 28, 9, 0, 0);
    default:
      return front({ mouth: "closed" });
  }
}

export function logo() {
  const g = front({ arms: "none" });
  const cut = 20;
  for (let y = cut + 1; y < 32; y++) for (let x = 0; x < 32; x++) g.set(x, y, ".");
  const [l, r] = FRONT[cut];
  for (let x = l; x <= r; x++) g.set(x, cut, "K");
  g.shift(0, 6);
  return g;
}
