// 32x32 harf ızgarası: sprite'lar harf haritası olarak çizilir, sonra palete çevrilir.
// Harfler: . saydam · K kontur · O gövde · S gölge · L ışık · C yüz/karın · P yanak · B mavi (zzz, ter, şok)
export const SIZE = 32;

export const PALETTE = {
  K: "#2B1E2F",
  O: "#F2A65A",
  S: "#D9774A",
  L: "#FFD29A",
  C: "#FFF1D6",
  P: "#E86A7A",
  B: "#6EC5E9",
};

export class Grid {
  constructor(size = SIZE) {
    this.size = size;
    this.px = Array.from({ length: size }, () => Array(size).fill("."));
    /**
     * Aksesuar bağlantı noktaları (WR2a): ad -> {x, y} ya da {hidden: gerekçe}.
     * Pikselleri değiştiren dönüşümler (shift, lean, breathe, clipRight) noktaları da aynı şekilde taşır.
     */
    this.points = {};
    /** ekran kenarı: x >= edge olan her şey (aksesuar dahil) kenarın arkasında, çizilmez */
    this.edge = null;
  }

  clone() {
    const g = new Grid(this.size);
    g.px = this.px.map((r) => [...r]);
    g.points = structuredClone(this.points);
    g.edge = this.edge;
    return g;
  }

  /** Bağlantı noktası koy (pikselleri değiştirmez). */
  mark(name, x, y) {
    this.points[name] = { x, y };
    return this;
  }

  /** Bu karede bilinçli olarak yok (ör. arkadan bakarken gözler). */
  hide(name, reason) {
    this.points[name] = { hidden: reason };
    return this;
  }

  /** Görünür her noktaya f(x, y) -> [x, y] | null uygular; null ya da kare dışı = gizli (reason). */
  movePoints(f, reason) {
    for (const [name, p] of Object.entries(this.points)) {
      if (p.hidden) continue;
      const next = f(p.x, p.y);
      if (!next) this.points[name] = { hidden: reason };
      else if (next[0] < 0 || next[1] < 0 || next[0] >= this.size || next[1] >= this.size) this.points[name] = { hidden: "offscreen" };
      else this.points[name] = { x: next[0], y: next[1] };
    }
  }

  get(x, y) {
    return x < 0 || y < 0 || x >= this.size || y >= this.size ? "." : this.px[y][x];
  }

  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    this.px[y][x] = c;
  }

  /**
   * Harf haritası damgası; "." saydam (alttakini korur).
   * mirror: yatay ayna (sağ kol = sol kolun aynası).
   */
  stamp(rows, x0, y0, { mirror = false } = {}) {
    rows.forEach((row, j) => {
      const cells = mirror ? [...row].reverse() : [...row];
      cells.forEach((c, i) => {
        if (c !== ".") this.set(x0 + i, y0 + j, c);
      });
    });
    return this;
  }

  /**
   * Satır aralıklarıyla (y -> [sol, sağ], sınırlar dahil) dolu gövde: kenar K, iç O,
   * sağ ve alt iç kenarda 1 px gölge (S).
   */
  body(spans) {
    const inside = (x, y) => {
      const s = spans[y];
      return s !== undefined && x >= s[0] && x <= s[1];
    };
    for (const [ys, [l, r]] of Object.entries(spans)) {
      const y = Number(ys);
      for (let x = l; x <= r; x++) {
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        if (edge) this.set(x, y, "K");
        else if (!inside(x + 2, y) || !inside(x, y + 2)) this.set(x, y, "S");
        else this.set(x, y, "O");
      }
    }
    return this;
  }

  /** Aralıklarla tanımlı bölgeyi (gövde içinde, kontura dokunmadan) bir renkle boyar. */
  fill(spans, c) {
    for (const [ys, [l, r]] of Object.entries(spans)) {
      const y = Number(ys);
      for (let x = l; x <= r; x++) if (this.get(x, y) !== "K" && this.get(x, y) !== ".") this.set(x, y, c);
    }
    return this;
  }

  /** Noktalar boyunca 1 px çizgi (renk c) ve 4 komşulu 1 px K kontur (ince tel: tüy). */
  strand(points, c = "O") {
    const on = new Set(points.map(([x, y]) => `${x},${y}`));
    const around = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [x, y] of points) {
      for (const [dx, dy] of around) {
        const k = `${x + dx},${y + dy}`;
        if (!on.has(k) && this.get(x + dx, y + dy) === ".") this.set(x + dx, y + dy, "K");
      }
    }
    for (const [x, y] of points) this.set(x, y, c);
    return this;
  }

  /** Öne eğilme (koşu): satırlar sağa kayar. steps: [[yMax, dx], ...] yMax küçükten büyüğe. */
  lean(steps) {
    this.px = this.px.map((row, y) => {
      const step = steps.find(([yMax]) => y <= yMax);
      if (!step) return row;
      const dx = step[1];
      return row.map((_, x) => row[x - dx] ?? ".");
    });
    this.movePoints((x, y) => {
      const step = steps.find(([yMax]) => y <= yMax);
      return [x + (step ? step[1] : 0), y];
    });
    return this;
  }

  /** Tümünü kaydır (taşan kısım kaybolur). */
  shift(dx, dy) {
    const g = new Grid(this.size);
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) g.set(x + dx, y + dy, this.px[y][x]);
    this.px = g.px;
    this.movePoints((x, y) => [x + dx, y + dy]);
    return this;
  }

  /** Nefes: yBreak satırının üstünü 1 px aşağı iter (gövde hafifçe basılır). */
  breathe(yBreak) {
    for (let y = yBreak; y >= 1; y--) this.px[y] = [...this.px[y - 1]];
    this.px[0] = Array(this.size).fill(".");
    this.movePoints((x, y) => [x, y < yBreak ? y + 1 : y]);
    return this;
  }

  /** x >= cut olan pikselleri sil (kenarın arkasında kalan kısım). */
  clipRight(cut) {
    for (const row of this.px) for (let x = cut; x < this.size; x++) row[x] = ".";
    this.movePoints((x, y) => (x >= cut ? null : [x, y]), "behind the edge");
    this.edge = this.edge === null ? cut : Math.min(this.edge, cut);
    return this;
  }

  rows() {
    return this.px.map((r) => r.join(""));
  }
}
