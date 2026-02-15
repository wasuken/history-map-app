import { useState, useEffect } from "react";
import MapComponent from "./components/MapComponent";
import SearchBar from "./components/SearchBar";
import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import type {
  Country,
  CountryCollection,
  DrawMode,
  DrawnPolygon,
  Arrow,
  Note,
  SearchMode,
  HighlightedCountry,
} from "./types";
import { HISTORICAL_YEARS, getHistoricalDataUrl } from "./data/historicalYears";
import "./components/Header.css";
import "./components/Sidebar.css";

// ハイライト用の色の配列
const HIGHLIGHT_COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#10b981", // green-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

function App() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [highlightedCountries, setHighlightedCountries] = useState<
    HighlightedCountry[]
  >([]);
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
      fetch("/data/modern/countries.geojson")
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
  // ESCキーで作図モードをキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawMode("none");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectCountry = (country: Country) => {
    setHighlightedCountries((prev) => {
      // これから追加しようとしている国の年代ラベルを特定
      let yearLabel = "現代";
      if (searchMode === "historical") {
        const yearData = HISTORICAL_YEARS.find((y) => y.year === selectedYear);
        if (yearData) {
          yearLabel = yearData.label;
        }
      }

      // 「名前」と「年代」の両方で国が既にハイライトされているかチェック
      const existing = prev.find(
        (hc) =>
          hc.country.properties.NAME === country.properties.NAME &&
          hc.yearLabel === yearLabel,
      );

      // 既に存在する場合は何もしない
      if (existing) {
        return prev;
      }

      // 新しくハイライトする
      const colorIndex = prev.length % HIGHLIGHT_COLORS.length;
      const newHighlightedCountry: HighlightedCountry = {
        id: crypto.randomUUID(),
        country,
        color: HIGHLIGHT_COLORS[colorIndex],
        yearLabel, // 特定した年代ラベルを使用
        displayMode: "fill",
      };
      return [...prev, newHighlightedCountry];
    });
    setDrawMode("none");
  };

  // ハイライトの削除
  const handleRemoveHighlight = (id: string) => {
    setHighlightedCountries((prev) => prev.filter((hc) => hc.id !== id));
  };

  // ハイライトの表示モード切替
  const handleToggleDisplayMode = (id: string) => {
    setHighlightedCountries((prev) =>
      prev.map((hc) =>
        hc.id === id
          ? {
              ...hc,
              displayMode: hc.displayMode === "fill" ? "outline" : "fill",
            }
          : hc,
      ),
    );
  };

  const handleReset = () => {
    if (confirm("すべての描画をリセットしますか?")) {
      setDrawnPolygons([]);
      setArrows([]);
      setNotes([]);
      setHighlightedCountries([]);
      setDrawMode("none");
    }
  };

  const handleExport = () => {
    alert("PNG出力機能は次に実装します!");
  };

  // 描画オブジェクトの表示/非表示を切り替える
  const handleToggleVisibility = (
    id: string,
    type: "polygon" | "arrow" | "note",
  ) => {
    if (type === "polygon") {
      setDrawnPolygons((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          // 非表示の場合は 'fill' に戻し、表示中の場合は 'hidden' にする
          const newDisplayMode = p.displayMode === "hidden" ? "fill" : "hidden";
          return { ...p, displayMode: newDisplayMode };
        }),
      );
    } else if (type === "arrow") {
      setArrows((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const newDisplayMode =
            a.displayMode === "hidden" ? "visible" : "hidden";
          return { ...a, displayMode: newDisplayMode };
        }),
      );
    } else if (type === "note") {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const newDisplayMode =
            n.displayMode === "hidden" ? "visible" : "hidden";
          return { ...n, displayMode: newDisplayMode };
        }),
      );
    }
  };

  // 描画オブジェクトを削除する
  const handleDeleteItem = (
    id: string,
    type: "polygon" | "arrow" | "note",
  ) => {
    if (type === "polygon") {
      setDrawnPolygons((prev) => prev.filter((p) => p.id !== id));
    } else if (type === "arrow") {
      setArrows((prev) => prev.filter((a) => a.id !== id));
    } else if (type === "note") {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  // ポリゴンの表示モードを切り替える (fill / outline)
  const handleTogglePolygonDisplayMode = (id: string) => {
    setDrawnPolygons((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.displayMode === "hidden") return p;
        // 'fill' と 'outline' の間で切り替える
        const newDisplayMode = p.displayMode === "fill" ? "outline" : "fill";
        return { ...p, displayMode: newDisplayMode };
      }),
    );
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
            onSelectCountry={handleSelectCountry}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />

          {highlightedCountries.length > 0 && (
            <div className="highlight-list">
              <button
                onClick={() => setHighlightedCountries([])}
                className="highlight-reset-button all"
              >
                全解除
              </button>
              {highlightedCountries.map((hc) => (
                <div
                  key={hc.id}
                  className="highlight-item"
                  style={{ backgroundColor: hc.color }}
                >
                  <span
                    className="highlight-label"
                    onClick={() => handleToggleDisplayMode(hc.id)}
                    title="クリックで表示切替"
                  >
                    {hc.yearLabel} - {hc.country.properties.NAME}
                  </span>
                  <button
                    className="highlight-delete-button"
                    onClick={() => handleRemoveHighlight(hc.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* メインコンテンツ */}
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
          <MapComponent
            highlightedCountries={highlightedCountries}
            drawMode={drawMode}
            drawnPolygons={drawnPolygons}
            arrows={arrows}
            notes={notes}
            onAddPolygon={(polygon) =>
	      {
			      console.log("[onAddPolygon]", polygon)
		              setDrawnPolygons((prev) => [
                ...prev,
                { ...polygon, displayMode: "fill" },
              ])
	      }
            }
            onAddArrow={(arrow) =>
              setArrows((prev) => [...prev, { ...arrow, displayMode: "visible" }])
            }
            onAddNote={(note) =>
              setNotes((prev) => [...prev, { ...note, displayMode: "visible" }])
            }
          />
        </div>

        {/* サイドバー */}
        <Sidebar
          polygons={drawnPolygons}
          arrows={arrows}
          notes={notes}
          onToggleVisibility={handleToggleVisibility}
          onDeleteItem={handleDeleteItem}
          onTogglePolygonDisplayMode={handleTogglePolygonDisplayMode}
        />
      </div>
    </div>
  );
}

export default App;
