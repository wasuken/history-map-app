import type { HistoricalYear } from "../types";

export const HISTORICAL_YEARS: HistoricalYear[] = [
  { year: -2000, label: "紀元前2000年", filename: "world_bc2000.geojson" },
  { year: -500, label: "紀元前500年", filename: "world_bc500.geojson" },
  { year: -323, label: "紀元前323年", filename: "world_bc323.geojson" },
  { year: -200, label: "紀元前200年", filename: "world_bc200.geojson" },
  { year: -1, label: "紀元前1年", filename: "world_bc1.geojson" },
  { year: 400, label: "400年", filename: "world_400.geojson" },
  { year: 600, label: "600年", filename: "world_600.geojson" },
  { year: 800, label: "800年", filename: "world_800.geojson" },
  { year: 1000, label: "1000年", filename: "world_1000.geojson" },
  { year: 1279, label: "1279年", filename: "world_1279.geojson" },
  { year: 1492, label: "1492年", filename: "world_1492.geojson" },
  { year: 1530, label: "1530年", filename: "world_1530.geojson" },
  { year: 1650, label: "1650年", filename: "world_1650.geojson" },
  { year: 1715, label: "1715年", filename: "world_1715.geojson" },
  { year: 1783, label: "1783年", filename: "world_1783.geojson" },
  { year: 1880, label: "1880年", filename: "world_1880.geojson" },
  { year: 1914, label: "1914年", filename: "world_1914.geojson" },
  { year: 1920, label: "1920年", filename: "world_1920.geojson" },
];

// ローカルファイルを参照するように変更
export function getHistoricalDataUrl(filename: string): string {
  return `/data/historical/${filename}`;
}

export function getModernDataUrl(): string {
  return '/data/modern/countries.geojson';
}
