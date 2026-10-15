// Kenar yolu: çalışma alanında U şekli (sol kenar yukarıdan aşağı, alt kenar soldan sağa, sağ kenar aşağıdan yukarı).
// Tek koordinat `s` yol boyunca ilerler; köşeler kendiliğinden dönülür.
// Konumlar pet kutusunun sol üst köşesi, çalışma alanına göre mantıksal piksel.

export type Edge = "left" | "bottom" | "right";

export interface PathPoint {
  x: number;
  y: number;
  edge: Edge;
}

export class EdgePath {
  readonly xMax: number;
  readonly yMax: number;
  readonly yMin: number;
  /** dikey kenarlardan birinin uzunluğu */
  readonly vLen: number;
  readonly length: number;

  /**
   * @param topReserve dikey kenarlarda pet kutusunun çıkabileceği en üst y (üstte balon payı kalsın)
   */
  constructor(
    readonly workW: number,
    readonly workH: number,
    readonly boxW: number,
    readonly boxH: number,
    topReserve: number,
  ) {
    this.xMax = Math.max(0, workW - boxW);
    this.yMax = Math.max(0, workH - boxH);
    this.yMin = Math.min(Math.max(0, topReserve), this.yMax);
    this.vLen = this.yMax - this.yMin;
    this.length = 2 * this.vLen + this.xMax;
  }

  clamp(s: number): number {
    return Math.min(this.length, Math.max(0, s));
  }

  /** Alt kenarın başı/sonu (köşeler). */
  get bottomStart(): number {
    return this.vLen;
  }
  get bottomEnd(): number {
    return this.vLen + this.xMax;
  }

  pointAt(s: number): PathPoint {
    const t = this.clamp(s);
    if (t < this.vLen) return { x: 0, y: this.yMin + t, edge: "left" };
    if (t <= this.bottomEnd) return { x: t - this.vLen, y: this.yMax, edge: "bottom" };
    return { x: this.xMax, y: this.yMax - (t - this.bottomEnd), edge: "right" };
  }

  /** Verilen kutu konumuna yoldaki en yakın nokta (snap). Eşitlikte alt kenar. */
  project(x: number, y: number): number {
    const cx = Math.min(this.xMax, Math.max(0, x));
    const cy = Math.min(this.yMax, Math.max(this.yMin, y));
    const candidates: [number, number][] = [
      // [uzaklık², s]
      [(y - this.yMax) ** 2 + (x - cx) ** 2, this.vLen + cx],
      [x ** 2 + (y - cy) ** 2, cy - this.yMin],
      [(x - this.xMax) ** 2 + (y - cy) ** 2, this.bottomEnd + (this.yMax - cy)],
    ];
    let best = candidates[0];
    for (const c of candidates) if (c[0] < best[0]) best = c;
    return best[1];
  }

  /** Kutu konumunu çalışma alanı içine sınırlar (sürüklerken). */
  clampBox(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.min(this.xMax, Math.max(0, x)),
      y: Math.min(this.yMax, Math.max(0, y)),
    };
  }
}
