import type { DrawMode } from "../types";
import "./Toolbar.css";

interface ToolbarProps {
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  onReset: () => void;
  onExport: () => void;
}

export default function Toolbar({
  drawMode,
  onDrawModeChange,
  onReset,
  onExport,
}: ToolbarProps) {
  return (
    <div className="toolbar-container">
      <button
        onClick={() => onDrawModeChange(drawMode === "polygon" ? "none" : "polygon")}
        className={`toolbar-button ${drawMode === "polygon" ? "active" : ""}`}
      >
        📐 ポリゴン
      </button>
      <button
        onClick={() => onDrawModeChange(drawMode === "arrow" ? "none" : "arrow")}
        className={`toolbar-button ${drawMode === "arrow" ? "active" : ""}`}
      >
        ➡️ 矢印
      </button>
      <button
        onClick={() => onDrawModeChange(drawMode === "note" ? "none" : "note")}
        className={`toolbar-button ${drawMode === "note" ? "active" : ""}`}
      >
        📝 注記
      </button>

      <div className="toolbar-separator" />

      <button onClick={onReset} className="toolbar-button reset-button">
        🗑️ リセット
      </button>
      <button onClick={onExport} className="toolbar-button export-button">
        💾 PNG出力
      </button>
    </div>
  );
}
