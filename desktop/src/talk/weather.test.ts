import { describe, expect, it } from "vitest";
import { seasonalWeather, WEATHER_TRIGGERS } from "./weather";

describe("seasonalWeather (FB14-2)", () => {
  it("winter produces cold predominantly", () => {
    const jan = new Date(2026, 0, 15);
    expect(seasonalWeather(jan, () => 0.1)).toBe("weather:cold");
    expect(seasonalWeather(jan, () => 0.8)).toBe("weather:rain");
    expect(seasonalWeather(jan, () => 0.95)).toBe("weather:clear");
  });

  it("summer produces hot predominantly", () => {
    const jul = new Date(2026, 6, 15);
    expect(seasonalWeather(jul, () => 0.1)).toBe("weather:hot");
    expect(seasonalWeather(jul, () => 0.8)).toBe("weather:clear");
    expect(seasonalWeather(jul, () => 0.95)).toBe("weather:rain");
  });

  it("spring and autumn produce rain, clear, and cold appropriately", () => {
    const apr = new Date(2026, 3, 15);
    expect(seasonalWeather(apr, () => 0.2)).toBe("weather:rain");
    expect(seasonalWeather(apr, () => 0.6)).toBe("weather:clear");

    const oct = new Date(2026, 9, 15);
    expect(seasonalWeather(oct, () => 0.2)).toBe("weather:rain");
    expect(seasonalWeather(oct, () => 0.6)).toBe("weather:cold");
  });

  it("returns one of known weather triggers", () => {
    const d = new Date(2026, 4, 1);
    const result = seasonalWeather(d);
    expect(WEATHER_TRIGGERS).toContain(result);
  });
});
