import { describe, expect, it } from "vitest";
import { platformFromUserAgent } from "../src/lib/platform";

const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";

describe("platformFromUserAgent", () => {
  it("detects windows", () => expect(platformFromUserAgent(WINDOWS)).toBe("windows"));
  it("detects mac", () => expect(platformFromUserAgent(MAC)).toBe("mac"));
  it("sends iphone to windows (no mobile build)", () => expect(platformFromUserAgent(IPHONE)).toBe("windows"));
  it("falls back to windows for unknown or empty", () => {
    expect(platformFromUserAgent(LINUX)).toBe("windows");
    expect(platformFromUserAgent("")).toBe("windows");
    expect(platformFromUserAgent(null)).toBe("windows");
    expect(platformFromUserAgent(undefined)).toBe("windows");
  });
});
