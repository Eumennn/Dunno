// Kostüm haritaları (SPEC 09 K2; placeholder çizimler, tasarımcı onayı bekliyor). Kostüm = aksesuardan büyük, tüm gövdeyi saran katman:
// - `palette`: gövde rol renkleri (temanın yerine; sadece ana palet ya da themes.json renkleri, test doğrular)
// - `bands`: bağlantı noktasına göre satırlarda gövde/gölge/ışık piksellerini tek renge boyar (arı çizgileri, pizza kenarı)
// - `parts`: aksesuar gibi bir noktaya oturan katmanlar. Harfler: K P B W ana palet, O S L C = kostümün gövde/gölge/ışık/yüz rengi.
//   `only`: sadece bu durumlarda çizilir (yandan görünüş için ayrı çizim); `frames`: "even" | "odd" kare (sinek kanadı çırpar).
// - `hidesTuft`: tüy çizilmez (antenler tüyün yerini alır) · `blocks`: kapattığı aksesuar slotları (astronot kaskı -> head).
// Üretici: node scripts/gen-wardrobe.mjs -> content/wardrobe/costumes/<id>.json + <id>.<part>.png + <id>.png (dolap simgesi).

const SIDE = ["walk", "run_away"];
const FRONTISH = ["idle", "shrug", "talk", "sulk", "peek", "shh", "dragged", "fart", "wave", "jump", "dance", "yawn", "sneeze"];

/** Kafanın üstünde iki ince anten (tüyün yerine), uçlarda topuz. */
const ANTENNAE = {
  id: "antennae",
  anchor: "head",
  origin: [5, 5],
  hiddenIn: [],
  map: [
    "KK......KK",
    "KK......KK",
    ".K......K.",
    "..K....K..",
    "...K..K...",
  ],
};

/** Saydam piksel kanatlar (beyaz + mavi damar), iki kare: yukarı / aşağı. */
const WING_ROWS = [
  ".KKK....................KKK.",
  "KWWWK..................KWWWK",
  "KWBWWK................KWWBWK",
  "KWWBWK................KWBWWK",
  ".KWWWK................KWWWK.",
  "..KKK..................KKK..",
];
const wings = (id, frames, oy) => ({ id, anchor: "head", origin: [14, oy], hiddenIn: ["sulk", "peek"], frames, map: WING_ROWS });

// FB5: yandan görünüşte (yürü/koş) ve uykuda da kostüm okunsun: eskiden böcek/hamamböceği parçaları sadece önden çizildiği için
// yürürken düz renkli bir yumak kalıyordu. Konumlar walk/sleep karelerinin gövdesi ölçülerek (ears noktasına göre) seçildi.
/** yürürken orta bacak: iki ayağın arasında, gövdenin altında (ears + 13) */
const MID_LEG = { id: "leg_side", anchor: "ears", origin: [1, -13], only: SIDE, map: ["KK"] };

/** Hamamböceği kanat kenarı (yandan): sırttan aşağı çapraz kontur + gölge; walk karesinde ears (16,15) -> sol üst (8,10). */
function wingEdge() {
  const line = { 10: 14, 11: 14, 12: 13, 13: 13, 14: 12, 15: 12, 16: 12, 17: 11, 18: 11, 19: 11, 20: 10, 21: 10, 22: 10, 23: 9, 24: 9 };
  const rows = [];
  for (let y = 10; y <= 24; y++) {
    let r = "";
    for (let x = 8; x <= 14; x++) r += x === line[y] ? "K" : x === line[y] - 1 ? "S" : ".";
    rows.push(r);
  }
  return rows;
}

export const COSTUMES = [
  {
    id: "bug",
    name: { tr: "böcek", en: "bug" },
    palette: { body: "#F4838F", shade: "#D9576A", light: "#FFC2C8", belly: "#FFF1D6" },
    hidesTuft: true,
    blocks: [],
    parts: [
      ANTENNAE,
      {
        id: "shell",
        anchor: "neck",
        origin: [11, 5],
        only: FRONTISH,
        map: [
          "......................",
          "KK..................KK",
          "KK..................KK",
          "......................",
          "......................",
          ".KK................KK.",
          ".KK................KK.",
          "......................",
          "KK..................KK",
          "KK..................KK",
        ],
      },
      {
        id: "legs",
        anchor: "neck",
        origin: [15, -4],
        only: ["idle", "shrug", "talk", "sulk", "shh"],
        map: [
          "KK..........................KK",
          "..............................",
          "KK..........................KK",
          "..............................",
          "...KK....................KK...",
        ],
      },
      // FB5: yandan sırt benekleri (walk karesinde ears (16,15) -> sol üst (6,11))
      {
        id: "shell_side",
        anchor: "ears",
        origin: [10, 4],
        only: SIDE,
        map: [".....KK", ".....KK", ".......", ".......", ".KK....", ".KK....", ".......", ".......", ".....KK", ".....KK", "KK.....", "KK....."],
      },
      // uykuda yatık gövdede benekler (sleep karesinde ears (16,22) -> sol üst (4,21))
      { id: "shell_sleep", anchor: "ears", origin: [12, 1], only: ["sleep"], map: ["....KK..", "....KK..", "KK......", "KK....KK", "......KK"] },
      MID_LEG,
    ],
  },
  {
    id: "fly",
    name: { tr: "sinek", en: "fly" },
    palette: { body: "#A9A9A9", shade: "#888888", light: "#D2D2D2", belly: "#F2F2F2" },
    hidesTuft: true,
    blocks: ["eyes"],
    parts: [
      ANTENNAE,
      wings("wings_up", "even", 2),
      wings("wings_down", "odd", -1),
      {
        id: "eyes",
        anchor: "eyes",
        origin: [7, 2],
        hiddenIn: [],
        map: [
          ".KKKK....KKKK.",
          "KBKBBK..KBKBBK",
          "KBBKBK..KBBKBK",
          "KBKBBK..KBKBBK",
          ".KKKK....KKKK.",
        ],
      },
    ],
  },
  {
    id: "bee",
    name: { tr: "arı", en: "bee" },
    palette: { body: "#F2D54E", shade: "#D1AE2A", light: "#FFF0A0", belly: "#FFFBE0" },
    // şeritler boyun çevresinde (ayaklar 26+ satırda gölge renginde: oraya inen şerit yürürken ayakları siyaha boyuyordu)
    bands: [{ anchor: "neck", rows: [-2, -1, 2, 3], color: "#2B1E2F" }],
    hidesTuft: true,
    blocks: [],
    parts: [
      ANTENNAE,
      wings("wings_up", "even", 2),
      wings("wings_down", "odd", -1),
      { id: "stinger", anchor: "neck", origin: [1, -9], only: FRONTISH, map: ["KLK", ".K."] },
    ],
  },
  {
    id: "ghost",
    name: { tr: "hayalet", en: "ghost" },
    palette: { body: "#FFFFFF", shade: "#D2D2D2", light: "#FFFFFF", belly: "#F2F2F2" },
    hidesTuft: true,
    blocks: ["neck", "body"],
    parts: [
      { id: "peak", anchor: "head", origin: [3, 3], hiddenIn: [], map: ["..KK..", ".KOOK.", "KOOOOK"] },
      {
        id: "hem",
        anchor: "neck",
        origin: [10, -8],
        hiddenIn: ["sleep"],
        map: [
          "KOOOOOOOOOOOOOOOOOOK",
          "KOOKOOKOOKKOOKOOKOOK",
          ".KK.KK.KK..KK.KK.KK.",
        ],
      },
    ],
  },
  {
    id: "dino",
    name: { tr: "dinozor", en: "dino" },
    palette: { body: "#7DB36A", shade: "#5A9148", light: "#B9DCA6", belly: "#F1F7E8" },
    hidesTuft: true,
    blocks: ["head", "side"],
    parts: [
      { id: "spikes", anchor: "head", origin: [6, 3], hiddenIn: [], map: ["..K...K...K..", ".KSK.KSK.KSK.", "KSSSKSSSKSSSK"] },
      { id: "tail", anchor: "neck", origin: [16, -3], only: FRONTISH, map: ["..KKK", ".KSSK", "KSSK.", "KKK.."] },
      { id: "tail_side", anchor: "ears", origin: [16, -7], only: SIDE, map: ["...KKK", "..KSSK", ".KSSK.", "KSSK..", "KKK..."] },
    ],
  },
  {
    id: "frog",
    name: { tr: "kurbağa", en: "frog" },
    palette: { body: "#66CC66", shade: "#3F9E45", light: "#A8F0A0", belly: "#EAFBE6" },
    hidesTuft: true,
    blocks: ["head"],
    parts: [
      {
        id: "eye_bumps",
        anchor: "head",
        origin: [6, 3],
        hiddenIn: ["sulk"],
        map: [
          ".KKKK..KKKK.",
          "KWWWWKKWWWWK",
          "KWKKWKKWKKWK",
          "KOOOOKKOOOOK",
        ],
      },
    ],
  },
  {
    id: "astronaut",
    name: { tr: "astronot", en: "astronaut" },
    palette: { body: "#FFFFFF", shade: "#D2D2D2", light: "#FFFFFF", belly: "#F2F2F2" },
    hidesTuft: true,
    blocks: ["head", "eyes", "side"],
    parts: [
      { id: "helmet", anchor: "head", origin: [13, 4], only: FRONTISH, map: helmet() },
      // yandan: yüz sağda, kask cam halkası yüzün çevresinde (önden kask kafa ortasına göre; yandan onu kullanmak yüzü kaçırıyordu)
      { id: "helmet_side", anchor: "eyes", origin: [8, 9], only: SIDE, map: helmet({ w: 17, h: 17, rx: 8.4, ry: 8.4 }) },
      { id: "pack", anchor: "ears", origin: [16, 3], only: SIDE, map: ["KKKKK", "KOOOK", "KOBOK", "KOOOK", "KOBOK", "KOOOK", "KOOOK", "KKKKK"] },
    ],
  },
  {
    id: "pizza",
    name: { tr: "pizza dilimi", en: "pizza slice" },
    palette: { body: "#F2D54E", shade: "#D1AE2A", light: "#FFF0A0", belly: "#FFFBE0" },
    bands: [{ anchor: "head", rows: [1, 2], color: "#B5713F" }],
    hidesTuft: true,
    blocks: [],
    parts: [
      {
        id: "pepperoni",
        anchor: "neck",
        origin: [11, 9],
        only: FRONTISH,
        map: [
          "..........PP..........",
          "..........PP..........",
          "......................",
          "PP..................PP",
          "PP..................PP",
          "......................",
          "......................",
          "......................",
          "......................",
          ".PP................PP.",
          ".PP................PP.",
          "......................",
          "......................",
          "...PP..........PP.....",
          "...PP..........PP.....",
        ],
      },
    ],
  },
  // ---------------------------------------------------------------- SPEC 12 yaratıklar (placeholder, tasarımcı onayı bekliyor)
  {
    id: "cockroach",
    name: { tr: "hamamböceği", en: "cockroach" },
    palette: { body: "#B5713F", shade: "#8E5330", light: "#DDA470", belly: "#FFF1D6" },
    hidesTuft: true,
    blocks: [],
    parts: [
      {
        id: "antennae",
        anchor: "head",
        origin: [8, 6],
        hiddenIn: [],
        map: ["K..............K", ".K............K.", "..K..........K..", "...K........K...", "....K......K....", ".....K....K....."],
      },
      {
        id: "legs",
        anchor: "neck",
        origin: [15, -4],
        only: ["idle", "shrug", "talk", "sulk", "shh"],
        map: ["KK..........................KK", "..............................", "KK..........................KK", "..............................", "...KK....................KK..."],
      },
      // FB5: yandan kanat kenarı + orta bacak; uykuda sırtta kanat çizgisi
      { id: "wing_side", anchor: "ears", origin: [8, 5], only: SIDE, map: wingEdge() },
      { id: "wing_sleep", anchor: "ears", origin: [13, 3], only: ["sleep"], map: ["......K", ".....KS", "....KS.", "...KS..", "..KS..."] },
      MID_LEG,
    ],
  },
  {
    id: "cat",
    name: { tr: "kedi", en: "cat" },
    palette: { body: "#A9A9A9", shade: "#888888", light: "#D2D2D2", belly: "#F2F2F2" },
    hidesTuft: true,
    blocks: ["head"],
    parts: [
      { id: "ears", anchor: "head", origin: [7, 2], hiddenIn: [], map: ["K............K", "KK..........KK", "KPK........KPK", "KOOK......KOOK", "KKKKK....KKKKK"] },
      { id: "whiskers", anchor: "eyes", origin: [15, -2], only: ["idle", "shrug", "talk", "shh", "dragged"], map: ["KKKK......................KKKK", "..............................", ".KKK......................KKK."] },
      { id: "tail", anchor: "neck", origin: [16, -3], only: FRONTISH, map: ["..KKK", ".KOOK", "KOOK.", "KKK.."] },
      { id: "tail_side", anchor: "ears", origin: [16, -7], only: SIDE, map: ["...KKK", "..KOOK", ".KOOK.", "KOOK..", "KKK..."] },
    ],
  },
  {
    id: "dog",
    name: { tr: "köpek", en: "dog" },
    palette: { body: "#CFA070", shade: "#A8754A", light: "#ECD0AE", belly: "#F7EBDD" },
    hidesTuft: false,
    blocks: [],
    parts: [
      {
        id: "ears",
        anchor: "head",
        origin: [11, -1],
        only: FRONTISH,
        map: [".KKK..............KKK.", "KSSSK............KSSSK", "KSSSK............KSSSK", "KSSSK............KSSSK", ".KSK..............KSK.", "..K................K.."],
      },
      { id: "nose", anchor: "eyes", origin: [1, -2], only: FRONTISH, map: ["KK", "KK"] },
      { id: "tail", anchor: "neck", origin: [16, -3], only: FRONTISH, map: ["..KKK", ".KSSK", "KSSK.", "KKK.."] },
      { id: "tail_side", anchor: "ears", origin: [16, -7], only: SIDE, map: ["...KKK", "..KSSK", ".KSSK.", "KSSK..", "KKK..."] },
    ],
  },
  {
    id: "slime",
    name: { tr: "slime", en: "slime" },
    palette: { body: "#5FB3D9", shade: "#3E8FB8", light: "#A8DCF0", belly: "#E8F6FB" },
    hidesTuft: true,
    blocks: [],
    parts: [
      { id: "drips", anchor: "neck", origin: [10, -8], hiddenIn: ["sleep"], map: ["KOK...KOK...KOK..KOK", ".K.....K.....K....K."] },
      { id: "blob", anchor: "head", origin: [2, 2], hiddenIn: [], map: [".KK.", "KOOK", "KOOK"] },
    ],
  },
  {
    id: "mushroom",
    name: { tr: "mantar", en: "mushroom" },
    palette: { body: "#ECD0AE", shade: "#CFA070", light: "#F7EBDD", belly: "#FFF1D6" },
    hidesTuft: true,
    blocks: ["head", "side"],
    parts: [
      {
        id: "cap",
        anchor: "head",
        origin: [11, 2],
        hiddenIn: [],
        map: [".....KKKKKKKKKKKK.....", "...KKPPPPWWPPPPPPKK...", "..KPPWWPPPPPPWWPPPPK..", ".KPPPWWPPPPPPWWPPPPPK.", "KPPPPPPPPWWPPPPPPPPPPK", "KKKKKKKKKKKKKKKKKKKKKK"],
      },
    ],
  },
  {
    id: "robot",
    name: { tr: "robot", en: "robot" },
    palette: { body: "#A9A9A9", shade: "#888888", light: "#D2D2D2", belly: "#F2F2F2" },
    hidesTuft: true,
    blocks: ["head", "eyes"],
    parts: [
      { id: "antenna", anchor: "head", origin: [2, 5], hiddenIn: [], map: [".KKK.", ".KBK.", ".KKK.", "..K..", "..K.."] },
      { id: "visor", anchor: "eyes", origin: [7, 1], hiddenIn: ["sulk"], map: ["KKKKKKKKKKKKKK", "KBBWWBBBBWWBBK", "KBBBBBBBBBBBBK", "KKKKKKKKKKKKKK"] },
    ],
  },
  {
    id: "alien",
    name: { tr: "uzaylı", en: "alien" },
    palette: { body: "#66CC66", shade: "#3F9E45", light: "#A8F0A0", belly: "#EAFBE6" },
    hidesTuft: true,
    blocks: [],
    parts: [{ id: "antennae", anchor: "head", origin: [6, 6], hiddenIn: [], map: ["KKK......KKK", "KBK......KBK", "KKK......KKK", ".K........K.", "..K......K..", "...K....K..."] }],
  },
  {
    id: "fish",
    name: { tr: "balık", en: "fish" },
    palette: { body: "#F7A982", shade: "#E08560", light: "#FFD3BC", belly: "#FFF3EA" },
    hidesTuft: true,
    blocks: [],
    parts: [
      { id: "fin", anchor: "head", origin: [3, 3], hiddenIn: [], map: ["..KK..", ".KSSK.", "KSSSSK"] },
      { id: "tail", anchor: "neck", origin: [16, -3], only: FRONTISH, map: ["K..KK", "KKSSK", "KSSK.", "KKKK."] },
      { id: "tail_side", anchor: "ears", origin: [16, -7], only: SIDE, map: ["K..KKK", "KK.KSK", "KSKSK.", "KSSK..", "KKKK.."] },
    ],
  },
  {
    id: "duck",
    name: { tr: "ördek", en: "duck" },
    palette: { body: "#F2D54E", shade: "#D1AE2A", light: "#FFF0A0", belly: "#FFFBE0" },
    hidesTuft: false,
    blocks: [],
    parts: [
      { id: "beak", anchor: "eyes", origin: [3, -2], only: FRONTISH, map: [".KKKK.", "KAAAAK", "KDDDDK", ".KKKK."] },
      { id: "beak_side", anchor: "eyes", origin: [-5, -2], only: SIDE, map: ["KKK.", "KAAK", "KDDK", "KKK."] },
    ],
  },
  {
    id: "skeleton",
    name: { tr: "iskelet", en: "skeleton" },
    palette: { body: "#F2F2F2", shade: "#D2D2D2", light: "#FFFFFF", belly: "#FFFFFF" },
    bands: [{ anchor: "neck", rows: [1, 3, 5], color: "#2B1E2F" }],
    hidesTuft: true,
    blocks: [],
    parts: [{ id: "sockets", anchor: "eyes", origin: [7, 1], hiddenIn: ["sulk"], map: ["KKKKK....KKKKK", "KKWKK....KKWKK", "KKKKK....KKKKK"] }],
  },
  {
    id: "vampire",
    name: { tr: "vampir", en: "vampire" },
    palette: { body: "#D2D2D2", shade: "#A9A9A9", light: "#F2F2F2", belly: "#F2F2F2" },
    hidesTuft: true,
    blocks: ["neck", "body"],
    parts: [
      { id: "hair", anchor: "head", origin: [5, -1], hiddenIn: ["sulk"], map: ["KKKKKKKKKK", ".KKKKKKKK.", "...KKKK...", "....KK...."] },
      { id: "collar", anchor: "neck", origin: [12, 3], hiddenIn: [], map: ["KK....................KK", "KPK..................KPK", "KPPK................KPPK", "KPPPKKKKKKKKKKKKKKKKPPPK"] },
      { id: "fangs", anchor: "eyes", origin: [2, -4], only: FRONTISH, map: ["W..W", "W..W"] },
    ],
  },
  {
    id: "mini_monster",
    name: { tr: "mini canavar", en: "mini monster" },
    palette: { body: "#B49AE0", shade: "#9478C9", light: "#DCCEF6", belly: "#FFF1D6" },
    hidesTuft: true,
    blocks: ["head"],
    parts: [
      { id: "horns", anchor: "head", origin: [6, 3], hiddenIn: [], map: [".K........K.", "KWK......KWK", "KWK......KWK", "KWWK....KWWK"] },
      { id: "teeth", anchor: "eyes", origin: [2, -4], only: FRONTISH, map: ["WKWKW"] },
    ],
  },
];

/**
 * Astronot kaskı: kafanın çevresinde elips kontur (K) + içte mavi cam kenarı (B), içi saydam (yüz görünür).
 * Önden 27 x 19, merkez (13, 9); origin (13, 4) kafa noktası (kaskın üst kenarının 4 satır altı). Koşarken eğik kafada da karede kalır.
 * Yandan küçük daire (17 x 17), yüzün (göz noktası) çevresinde.
 */
function helmet({ w = 27, h = 19, rx = 13.4, ry = 9.4 } = {}) {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const inside = (x, y, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (inside(x, y, rx, ry) && !inside(x, y, rx - 1.1, ry - 1.1)) row += "K";
      else if (inside(x, y, rx - 1.1, ry - 1.1) && !inside(x, y, rx - 2.2, ry - 2.2) && y < cy) row += "B";
      else row += ".";
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Gizli yaratıklar (SPEC 14, dolapta görünmez; content/eggs/costumes): canavar modu ve glitch dünyası. Aynı kostüm sistemi.
 * Renkler themes.json'dan (gece / pamuk şeker / retro yeşil / okyanus), test aynı kuralı uygular.
 */
export const HIDDEN_COSTUMES = [
  {
    id: "egg_monster",
    name: { tr: "canavar", en: "monster" },
    palette: { body: "#6475B0", shade: "#4E5D94", light: "#94A4D8", belly: "#D9E0F6" },
    hidesTuft: true,
    blocks: ["head", "eyes"],
    parts: [
      {
        id: "horns",
        anchor: "head",
        origin: [8, 5],
        hiddenIn: [],
        map: [
          "KK............KK",
          "KWK..........KWK",
          ".KWK........KWK.",
          ".KWWK......KWWK.",
          "..KWWK....KWWK..",
          "...KKK....KKK...",
        ],
      },
      { id: "brows", anchor: "eyes", origin: [6, 3], only: FRONTISH, map: ["KK........KK", ".KK......KK."] },
      { id: "fangs", anchor: "eyes", origin: [3, -4], only: FRONTISH, map: ["KWKKWK", ".W..W."] },
      {
        id: "spikes",
        anchor: "neck",
        origin: [12, 9],
        only: SIDE,
        map: ["...K......", "..KWK..K..", ".KWWK.KWK.", "KWWWKKWWK."],
      },
    ],
  },
  {
    id: "egg_glitch",
    name: { tr: "glitch", en: "glitch" },
    palette: { body: "#F4A6D7", shade: "#DB7FBA", light: "#FFD1EC", belly: "#EAFBE6" },
    // tarama çizgileri: gövdenin iki satırı yeşil, iki satırı mavi (bozuk ekran)
    bands: [
      { anchor: "neck", rows: [-6, 1], color: "#66CC66" },
      { anchor: "neck", rows: [-3, 4], color: "#5FB3D9" },
    ],
    hidesTuft: false,
    blocks: [],
    parts: [
      // kare kare yer değiştiren piksel gürültüsü (çift / tek kare)
      { id: "noise_a", anchor: "head", origin: [12, 2], hiddenIn: [], frames: "even", map: ["B.......K...", "....K.....B.", ".K....B....."] },
      { id: "noise_b", anchor: "head", origin: [12, 1], hiddenIn: [], frames: "odd", map: ["...K.....B..", "B......K....", "......K....B"] },
    ],
  },
];

// SPEC 17 R5 evrim formları (placeholder çizimler, tasarımcı onayı bekliyor): gizli kostüm gibi, content/eggs/costumes'a yazılır.
// Kostüm giyilmemişse form görünür. Renkler themes.json paletlerinden (test doğrular).
export const EVOLUTION_COSTUMES = [
  {
    id: "evo_chaos",
    name: { tr: "kaos", en: "chaos" },
    palette: { body: "#F7A982", shade: "#E08560", light: "#FFD3BC", belly: "#FFF3EA" },
    hidesTuft: true,
    blocks: [],
    parts: [
      // dağınık diken saç
      { id: "spikes", anchor: "head", origin: [6, 4], hiddenIn: [], map: ["K.....K.....K", "KK...KOK...KK", "KOK.KOOOK.KOK", ".KOKOOOOOKOK.", "..KOOOOOOOK.."] },
    ],
  },
  {
    id: "evo_chill",
    name: { tr: "sakin", en: "chill" },
    palette: { body: "#7FCFA8", shade: "#55AE86", light: "#BDEBD2", belly: "#FFF1D6" },
    hidesTuft: true,
    blocks: [],
    parts: [{ id: "sprout", anchor: "head", origin: [2, 6], hiddenIn: [], map: ["..KK.", ".KLLK", "KLLK.", ".KK..", "..K..", "..K.."] }],
  },
  {
    id: "evo_gremlin",
    name: { tr: "gremlin", en: "gremlin" },
    palette: { body: "#66CC66", shade: "#3F9E45", light: "#A8F0A0", belly: "#EAFBE6" },
    hidesTuft: true,
    blocks: [],
    parts: [
      { id: "ears", anchor: "head", origin: [14, -1], hiddenIn: [], map: ["KK........................KK", "KOKK....................KKOK", ".KOOKK................KKOOK.", "..KKKKK..............KKKKK.."] },
      { id: "grin", anchor: "eyes", origin: [3, -4], only: FRONTISH, map: ["KKKKKKK", "KWKWKWK"] },
    ],
  },
  {
    id: "evo_demon",
    name: { tr: "iblis", en: "demon" },
    palette: { body: "#F4838F", shade: "#D9576A", light: "#FFC2C8", belly: "#FFF1F0" },
    hidesTuft: true,
    blocks: [],
    parts: [
      { id: "horns", anchor: "head", origin: [6, 4], hiddenIn: [], map: ["K..........K", "KK........KK", "KLK......KLK", ".KK......KK."] },
      { id: "tail", anchor: "neck", origin: [17, -3], only: FRONTISH, map: ["KK....", "KSK...", ".KSKKK", "..KSSK", "...KKK"] },
      { id: "tail_side", anchor: "ears", origin: [17, -7], only: SIDE, map: ["KK....", "KSK...", ".KSK..", "..KSSK", "...KKK"] },
    ],
  },
  {
    id: "evo_sloth",
    name: { tr: "tembel hayvan", en: "sloth" },
    palette: { body: "#CFA070", shade: "#A8754A", light: "#ECD0AE", belly: "#F7EBDD" },
    hidesTuft: false,
    blocks: [],
    parts: [
      // ağır göz kapakları + göz altı
      { id: "lids", anchor: "eyes", origin: [6, 1], only: ["idle", "shrug", "talk", "sulk", "shh", "dragged", "fart"], map: ["KKKK....KKKK"] },
      { id: "bags", anchor: "eyes", origin: [6, -2], only: ["idle", "shrug", "talk", "sulk", "shh", "dragged", "fart"], map: ["SSSS....SSSS"] },
      { id: "lids_side", anchor: "eyes", origin: [5, 1], only: SIDE, map: ["KKKK..KKKK"] },
    ],
  },
  {
    id: "evo_cloud",
    name: { tr: "bulut", en: "cloud" },
    palette: { body: "#5FB3D9", shade: "#3E8FB8", light: "#A8DCF0", belly: "#E8F6FB" },
    hidesTuft: true,
    blocks: [],
    parts: [{ id: "puffs", anchor: "head", origin: [9, 5], hiddenIn: [], map: ["...KKK......KKK...", ".KKWWWKK..KKWWWKK.", "KWWWWWWWKKWWWWWWWK", ".KKKKKKKKKKKKKKKK."] }],
  },
  {
    id: "evo_glitchling",
    name: { tr: "bozukçuk", en: "glitchling" },
    palette: { body: "#B49AE0", shade: "#9478C9", light: "#DCCEF6", belly: "#FFF1D6" },
    bands: [
      { anchor: "neck", rows: [-8, -1], color: "#6EC5E9" },
      { anchor: "neck", rows: [2], color: "#66CC66" },
    ],
    hidesTuft: false,
    blocks: [],
    parts: [
      { id: "noise_a", anchor: "head", origin: [13, 3], hiddenIn: [], frames: "even", map: ["K.........B...", "......K......K", "..B.........."] },
      { id: "noise_b", anchor: "head", origin: [13, 2], hiddenIn: [], frames: "odd", map: ["....B.....K...", "K.........B...", ".......K.....K"] },
    ],
  },
];
