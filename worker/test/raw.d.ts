// vite/vitest `?raw` importu: dosya içeriği string olarak.
declare module "*?raw" {
  const content: string;
  export default content;
}
