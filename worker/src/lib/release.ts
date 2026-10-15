import data from "../data/releases.json";
import type { Platform } from "./platform";

export interface Release {
  version: string;
  size: string;
  notes: string;
  urls: Record<Platform, string>;
}

export const release: Release = data;

export function downloadUrl(r: Release, platform: Platform): string {
  return r.urls[platform] ?? r.urls.windows;
}
