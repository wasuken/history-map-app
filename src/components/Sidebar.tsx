import "./Sidebar.css";
import type { DrawnPolygon, Arrow, Note } from "../types";

type Item = (DrawnPolygon | Arrow | Note) & { itemType: "polygon" | "arrow" | "note" };

interface SidebarProps {
  polygons: DrawnPolygon[];
  arrows: Arrow[];
  notes: Note[];
  onToggleVisibility: (id: string, type: Item["itemType"]) => void;
  onDeleteItem: (id: string, type: Item["itemType"]) => void;
  onTogglePolygonDisplayMode: (id: string) => void;
}

export default function Sidebar({
  polygons,
  arrows,
  notes,
  onToggleVisibility,
  onDeleteItem,
  onTogglePolygonDisplayMode,
}: SidebarProps) {
  const allItems: Item[] = [
    ...polygons.map((p) => ({ ...p, itemType: "polygon" as const })),
    ...arrows.map((a) => ({ ...a, itemType: "arrow" as const })),
    ...notes.map((n) => ({ ...n, itemType: "note" as const })),
  ];

  const getItemName = (item: Item) => {
    if (item.itemType === "polygon") return item.name;
    if (item.itemType === "arrow") return item.memo || "矢印";
    if (item.itemType === "note") return item.text;
    return "無名のオブジェクト";
  };

  const getItemIcon = (itemType: Item["itemType"]) => {
    if (itemType === "polygon") return "📐";
    if (itemType === "arrow") return "➡️";
    if (itemType === "note") return "📝";
    return "";
  };

  return (
    <div className="sidebar">
      <h2 className="sidebar-title">描画オブジェクト</h2>
      {allItems.length === 0 ? (
        <p className="sidebar-empty-message">
          オブジェクトはまだありません。
        </p>
      ) : (
        <ul className="sidebar-list">
          {allItems.map((item) => (
            <li key={item.id} className="sidebar-item">
              <span className="item-icon">{getItemIcon(item.itemType)}</span>
              <span className="item-name">{getItemName(item)}</span>
              <div className="item-controls">
                {item.itemType === "polygon" && (
                  <button
                    onClick={() => onTogglePolygonDisplayMode(item.id)}
                    className={`display-mode-toggle`}
                    title="塗りつぶし/線のみ 切替"
                    disabled={item.displayMode === "hidden"}
                  >
                    {item.displayMode === "fill" ? "■" : "□"}
                  </button>
                )}
                <button
                  onClick={() => onToggleVisibility(item.id, item.itemType)}
                  className={`visibility-toggle ${
                    item.displayMode !== "hidden" ? "visible" : ""
                  }`}
                  title={
                    item.displayMode !== "hidden" ? "非表示にする" : "表示する"
                  }
                >
                  👁️
                </button>
                <button
                  onClick={() => onDeleteItem(item.id, item.itemType)}
                  className="delete-button"
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
