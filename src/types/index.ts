export interface Country {
  type: "Feature";
  properties: {
    NAME: string;
    NAME_JA?: string;
    ISO_A3?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface CountryCollection {
  type: "FeatureCollection";
  features: Country[];
}

// 検索モード
export type SearchMode = "modern" | "historical";

// 歴史的年代
export interface HistoricalYear {
  year: number;
  label: string;
  filename: string;
}

// 描画モード
export type DrawMode = "none" | "polygon" | "arrow" | "note";

// ポリゴン
export interface DrawnPolygon {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lng, lat]の配列
  color: string;
}

// 矢印
export interface Arrow {
  id: string;
  start: [number, number]; // [lng, lat]
  end: [number, number]; // [lng, lat]
  memo: string;
}

// 注記(ピン)
export interface Note {
  id: string;
  position: [number, number]; // [lng, lat]
  text: string;
}
