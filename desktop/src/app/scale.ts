// dunno.exe büyüyünce Dunno da büyür (SPEC 07 FB3/FB3b): pencere genişliği VE yüksekliğine göre tam sayı sprite ölçeği,
// küçük olanı (geniş ama alçak pencerede Dunno kartından taşmasın). Bulanık ara ölçek yok.
// Varsayılan 900x620'de 5x (160 px); büyütülünce 7x, büyük ekranda 9x.
export const PET_SCALES = [
  { minWidth: 0, minHeight: 0, scale: 5 },
  { minWidth: 1100, minHeight: 760, scale: 7 },
  { minWidth: 1500, minHeight: 1000, scale: 9 },
] as const;

export function petScaleFor(width: number, height: number): number {
  let s: number = PET_SCALES[0].scale;
  for (const step of PET_SCALES) if (width >= step.minWidth && height >= step.minHeight) s = step.scale;
  return s;
}
