// SPEC 09 K5: klasik temanın UI rolleri bugünkü ui-kit token'larıyla birebir aynı (klasik = bugünkü görünüm).
// CSS'i dosyadan okur (vitest .css importunu işler, ?raw boş gelir).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import raw from "../../content/wardrobe/themes.json";
import { loadThemes, themeUi } from "../src/wardrobe/themes";

const css = readFileSync(new URL("../../ui-kit/tokens.css", import.meta.url), "utf8");
const token = (name: string) => new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)![1];

describe("classic theme = today's ui-kit", () => {
  it("every UI role matches tokens.css", () => {
    const classic = loadThemes(raw).file!.themes.find((t) => t.id === "classic")!;
    expect(themeUi(classic)).toEqual({
      bar: token("--main"),
      button: token("--light"),
      buttonShade: token("--shade"),
      accent: token("--ice"),
      bg: token("--cream"),
      text: token("--ink"),
      dark: false,
    });
  });
});
