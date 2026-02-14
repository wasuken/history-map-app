import { useState, useEffect } from "react";
import Map from "./components/Map";
import SearchBar from "./components/SearchBar";
import Toolbar from "./components/Toolbar";
import type {
  Country,
  CountryCollection,
  DrawMode,
  DrawnPolygon,
  Arrow,
  Note,
  SearchMode,
} from "./types";
import { HISTORICAL_YEARS, getHistoricalDataUrl } from "./data/historicalYears";
import "./components/Header.css";

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [highlightedCountry, setHighlightedCountry] = useState<Country | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // 検索関連
  const [searchMode, setSearchMode] = useState<SearchMode>("modern");
  const [selectedYear, setSelectedYear] = useState<number>(
    HISTORICAL_YEARS[0].year,
  );

  // 描画関連
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [drawnPolygons, setDrawnPolygons] = useState<DrawnPolygon[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // 現代国データの読み込み
  useEffect(() => {
    if (searchMode === "modern") {
      setIsLoading(true);
      fetch(
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
      )
        .then((res) => res.json())
        .then((data: CountryCollection) => {
          setCountries(data.features);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("国データの取得に失敗:", err);
          setIsLoading(false);
        });
    }
  }, [searchMode]);

  // 歴史国データの読み込み
  useEffect(() => {
    if (searchMode === "historical") {
      setIsLoading(true);
      const yearData = HISTORICAL_YEARS.find((y) => y.year === selectedYear);
      if (!yearData) return;

      fetch(getHistoricalDataUrl(yearData.filename))
        .then((res) => res.json())
        .then((data: CountryCollection) => {
          setCountries(data.features);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("歴史国データの取得に失敗:", err);
          setIsLoading(false);
        });
    }
  }, [searchMode, selectedYear]);

  const handleReset = () => {
    if (confirm("すべての描画をリセットしますか?")) {
      setDrawnPolygons([]);
      setArrows([]);
      setNotes([]);
      setHighlightedCountry(null);
      setDrawMode("none");
    }
  };

  const handleExport = () => {
    alert("PNG出力機能は次に実装します!");
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ヘッダー */}
      <div className="app-header">
        <h1 className="app-title">歴史地図ノート</h1>

        <div>
          <SearchBar
            countries={countries}
            onSelectCountry={(country) => {
              setHighlightedCountry(country);
              setDrawMode("none");
            }}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />

          {highlightedCountry && (
            <button
              onClick={() => setHighlightedCountry(null)}
              className="highlight-reset-button"
            >
              ﾊｲﾗｲﾄ解除({highlightedCountry.properties.NAME})
            </button>
          )}
        </div>

        <div className="header-spacer" />

        <Toolbar
          drawMode={drawMode}
          onDrawModeChange={setDrawMode}
          onReset={handleReset}
          onExport={handleExport}
        />
      </div>

      {/* 地図エリア */}
      <div style={{ flex: 1, position: "relative" }}>
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              fontSize: "18px",
              color: "#666",
            }}
          >
            読み込み中...
          </div>
        )}
        <Map
          highlightedCountry={highlightedCountry}
          drawMode={drawMode}
          drawnPolygons={drawnPolygons}
          arrows={arrows}
          notes={notes}
          onAddPolygon={(polygon) =>
            setDrawnPolygons((prev) => [...prev, polygon])
          }
          onAddArrow={(arrow) => setArrows((prev) => [...prev, arrow])}
          onAddNote={(note) => setNotes((prev) => [...prev, note])}
        />
      </div>

      {/* ステータス表示 */}
      {(drawnPolygons.length > 0 || arrows.length > 0 || notes.length > 0) && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            backgroundColor: "white",
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            fontSize: "14px",
            zIndex: 10,
          }}
        >
          📐 {drawnPolygons.length} ・ ➡️ {arrows.length} ・ 📝 {notes.length}
        </div>
      )}
    </div>
  );
}

export default App;
