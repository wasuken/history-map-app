import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Country,
  DrawMode,
  DrawnPolygon,
  Arrow,
  Note,
  HighlightedCountry,
} from "../types";

interface MapProps {
  onMapLoad?: (map: maplibregl.Map) => void;
  highlightedCountries: HighlightedCountry[];
  drawMode: DrawMode;
  drawnPolygons: DrawnPolygon[];
  arrows: Arrow[];
  notes: Note[];
  onAddPolygon: (polygon: DrawnPolygon) => void;
  onAddArrow: (arrow: Arrow) => void;
  onAddNote: (note: Note) => void;
}

export default function MapComponent({
  onMapLoad,
  highlightedCountries,
  drawMode,
  drawnPolygons,
  arrows,
  notes,
  onAddPolygon,
  onAddArrow,
  onAddNote,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [arrowStart, setArrowStart] = useState<[number, number] | null>(null);
  // sourceId をキーとして、関連するレイヤーIDを管理
  const highlightedLayers = useRef<
    Map<string, { fill: string; line: string }>
  >(new Map());

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // 地図の初期化
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "raster-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "simple-tiles",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [0, 20],
      zoom: 2,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      if (map.current && onMapLoad) {
        onMapLoad(map.current);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [onMapLoad]);

  // クリックイベント処理
  useEffect(() => {
    if (!map.current) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      if (drawMode === "polygon") {
        setPolygonPoints((prev) => [...prev, [lng, lat]]);
      } else if (drawMode === "arrow") {
        if (!arrowStart) {
          setArrowStart([lng, lat]);
        } else {
          const memo = prompt("矢印のメモを入力してください (省略可)");
          onAddArrow({
            id: crypto.randomUUID(),
            start: arrowStart,
            end: [lng, lat],
            memo: memo || "",
          });
          setArrowStart(null);
        }
      } else if (drawMode === "note") {
        const text = prompt("注記を入力してください");
        if (text) {
          onAddNote({
            id: crypto.randomUUID(),
            position: [lng, lat],
            text,
          });
        }
      }
    };

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      if (drawMode === "polygon" && polygonPoints.length >= 3) {
        e.preventDefault();
        const name = prompt("ポリゴンの名前を入力してください");
        if (name) {
          const colors = [
            "#ef4444",
            "#f59e0b",
            "#10b981",
            "#3b82f6",
            "#8b5cf6",
            "#ec4899",
          ];
          const color = colors[Math.floor(Math.random() * colors.length)];

          onAddPolygon({
            id: crypto.randomUUID(),
            name,
            coordinates: polygonPoints,
            color,
          });
        }
        setPolygonPoints([]);
      }
    };

    map.current.on("click", handleClick);
    map.current.on("dblclick", handleDblClick);

    return () => {
      map.current?.off("click", handleClick);
      map.current?.off("dblclick", handleDblClick);
    };
  }, [
    drawMode,
    polygonPoints,
    arrowStart,
    onAddPolygon,
    onAddArrow,
    onAddNote,
  ]);

  // ハイライト表示の更新
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const mapInstance = map.current;

    const newLayerMap = new Map<string, { fill: string; line: string }>();
    highlightedCountries.forEach((hc) => {
      const countryId = (
        `${hc.yearLabel}-${hc.country.properties.NAME}` || crypto.randomUUID()
      ).replace(/[^a-zA-Z0-9]/g, "_");
      const sourceId = `highlighted-source-${countryId}`;
      newLayerMap.set(sourceId, {
        fill: `highlighted-fill-${countryId}`,
        line: `highlighted-line-${countryId}`,
      });
    });

    // 不要になった古いレイヤーとソースを削除
    highlightedLayers.current.forEach((layerIds, sourceId) => {
      if (!newLayerMap.has(sourceId)) {
        if (mapInstance.getLayer(layerIds.fill))
          mapInstance.removeLayer(layerIds.fill);
        if (mapInstance.getLayer(layerIds.line))
          mapInstance.removeLayer(layerIds.line);
        if (mapInstance.getSource(sourceId))
          mapInstance.removeSource(sourceId);
      }
    });

    const bounds = new maplibregl.LngLatBounds();

    highlightedCountries.forEach((hc) => {
      const countryId = (
        `${hc.yearLabel}-${hc.country.properties.NAME}` || crypto.randomUUID()
      ).replace(/[^a-zA-Z0-9]/g, "_");
      const sourceId = `highlighted-source-${countryId}`;
      const fillLayerId = `highlighted-fill-${countryId}`;
      const lineLayerId = `highlighted-line-${countryId}`;

      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: "geojson",
          data: hc.country,
        });
      }

      // Fill Layer
      if (!mapInstance.getLayer(fillLayerId)) {
        mapInstance.addLayer({
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": hc.color,
            "fill-opacity": hc.displayMode === "fill" ? 0.4 : 0,
          },
        });
      } else {
        mapInstance.setPaintProperty(
          fillLayerId,
          "fill-opacity",
          hc.displayMode === "fill" ? 0.4 : 0,
        );
      }

      // Line Layer
      if (!mapInstance.getLayer(lineLayerId)) {
        mapInstance.addLayer({
          id: lineLayerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": hc.color,
            "line-width": 1.5,
          },
        });
      } else {
        mapInstance.setPaintProperty(lineLayerId, "line-color", hc.color);
      }

      // バウンディングボックスの計算
      const addCoordinatesToBounds = (coordinates: any) => {
        if (!coordinates) return;
        for (const coord of coordinates) {
          if (typeof coord[0] === "number") {
            bounds.extend(coord as [number, number]);
          } else {
            addCoordinatesToBounds(coord);
          }
        }
      };
      addCoordinatesToBounds(hc.country.geometry.coordinates);
    });

    // 新しいレイヤー情報を保存
    highlightedLayers.current = newLayerMap;

    // すべてのハイライトが表示されるように地図を調整
    if (!bounds.isEmpty()) {
      mapInstance.fitBounds(bounds, { padding: 100, maxZoom: 6 });
    }
  }, [highlightedCountries]);

  // 描画中のポリゴンを表示
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const sourceId = "drawing-polygon";
    const layerId = "drawing-polygon-layer";
    const pointsLayerId = "drawing-points-layer";

    if (map.current.getLayer(pointsLayerId)) {
      map.current.removeLayer(pointsLayerId);
    }
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    if (polygonPoints.length > 0) {
      const geojson = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: polygonPoints,
            },
          },
        ],
      };

      map.current.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.current.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      map.current.addLayer({
        id: pointsLayerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 5,
          "circle-color": "#3b82f6",
        },
      });
    }
  }, [polygonPoints]);

  // 描画済みポリゴンを表示
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    drawnPolygons.forEach((polygon, index) => {
      const sourceId = `polygon-${polygon.id}`;
      const fillLayerId = `polygon-fill-${polygon.id}`;
      const lineLayerId = `polygon-line-${polygon.id}`;

      if (map.current!.getLayer(fillLayerId)) {
        map.current!.removeLayer(fillLayerId);
      }
      if (map.current!.getLayer(lineLayerId)) {
        map.current!.removeLayer(lineLayerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }

      const coordinates = [...polygon.coordinates, polygon.coordinates[0]];

      const geojson = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: { name: polygon.name },
            geometry: {
              type: "Polygon" as const,
              coordinates: [coordinates],
            },
          },
        ],
      };

      map.current!.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.current!.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": polygon.color,
          "fill-opacity": 0.4,
        },
      });

      map.current!.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": polygon.color,
          "line-width": 2,
        },
      });
    });
  }, [drawnPolygons]);

  // 矢印を表示
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    arrows.forEach((arrow) => {
      const sourceId = `arrow-${arrow.id}`;
      const layerId = `arrow-${arrow.id}`;

      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }

      const geojson = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: { memo: arrow.memo },
            geometry: {
              type: "LineString" as const,
              coordinates: [arrow.start, arrow.end],
            },
          },
        ],
      };

      map.current!.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.current!.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#dc2626",
          "line-width": 3,
        },
      });
    });
  }, [arrows]);

  // 注記を表示
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    notes.forEach((note) => {
      const sourceId = `note-${note.id}`;
      const layerId = `note-${note.id}`;
      const textLayerId = `note-text-${note.id}`;

      if (map.current!.getLayer(textLayerId)) {
        map.current!.removeLayer(textLayerId);
      }
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }

      const geojson = {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: { text: note.text },
            geometry: {
              type: "Point" as const,
              coordinates: note.position,
            },
          },
        ],
      };

      map.current!.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.current!.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 8,
          "circle-color": "#059669",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.current!.addLayer({
        id: textLayerId,
        type: "symbol",
        source: sourceId,
        layout: {
          "text-field": ["get", "text"],
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-size": 14,
        },
        paint: {
          "text-color": "#000",
          "text-halo-color": "#fff",
          "text-halo-width": 2,
        },
      });
    });
  }, [notes]);

  return (
    <>
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100%",
          cursor: drawMode !== "none" ? "crosshair" : "grab",
        }}
      />
      {drawMode === "polygon" && polygonPoints.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            fontSize: "14px",
            zIndex: 10,
          }}
        >
          頂点: {polygonPoints.length}個 | ダブルクリックで完成
        </div>
      )}
      {drawMode === "arrow" && arrowStart && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            fontSize: "14px",
            zIndex: 10,
          }}
        >
          終点をクリックしてください
        </div>
      )}
    </>
  );
}
