// Paylaşım GIF'i metinleri (marka sesi: küçük harf, ünlem yok). PLACEHOLDER: tasarımcı onayı bekler.
export const GIF_STRINGS = {
  tr: { save: "gif kaydet", saved: (p: string) => `gif kaydedildi: ${p}` },
  en: { save: "save gif", saved: (p: string) => `gif saved: ${p}` },
} as const;
