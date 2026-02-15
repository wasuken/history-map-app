import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapComponent.css";
import type {
  DrawMode,
  DrawnPolygon,
  Arrow,
  Note,
  HighlightedCountry,
} from "../types";

// displayModeはApp.tsxで処理されるため、onAddプロパティの型からは除外
type OnAddPolygon = Omit<DrawnPolygon, "displayMode">;
type OnAddArrow = Omit<Arrow, "displayMode">;
type OnAddNote = Omit<Note, "displayMode">;

interface MapProps {
  highlightedCountries: HighlightedCountry[];
  drawMode: DrawMode;
  drawnPolygons: DrawnPolygon[];
  arrows: Arrow[];
  notes: Note[];
  onAddPolygon: (polygon: OnAddPolygon) => void;
  onAddArrow: (arrow: OnAddArrow) => void;
  onAddNote: (note: OnAddNote) => void;
}

export default function MapComponent({
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
  const popup = useRef<maplibregl.Popup | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [arrowStart, setArrowStart] = useState<[number, number] | null>(null);
  const highlightedLayers = useRef<Map<string, { fill: string; line: string }>>(new Map());

  // --- Refs to track what's actually rendered on the map ---
  const polygonsOnMap = useRef<Map<string, DrawnPolygon>>(new Map());
  const arrowsOnMap = useRef<Map<string, Arrow>>(new Map());
  const notesOnMap = useRef<Map<string, Note>>(new Map());

  // --- Refs to store event listeners for proper cleanup ---
  const polygonListeners = useRef<Map<string, any>>(new Map());
  const arrowListeners = useRef<Map<string, any>>(new Map());
  const noteListeners = useRef<Map<string, any>>(new Map());

  // --- Map Initialization ---
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: { "raster-tiles": { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "simple-tiles", type: "raster", source: "raster-tiles", minzoom: 0, maxzoom: 19 }],
      },
      center: [0, 20],
      zoom: 2,
    });
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  // --- Drawing Logic ---
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      if (drawMode === "polygon") setPolygonPoints((prev) => [...prev, [lng, lat]]);
      else if (drawMode === "arrow") {
        if (!arrowStart) setArrowStart([lng, lat]);
        else {
          const memo = prompt("矢印のメモを入力してください (省略可)");
          onAddArrow({ id: crypto.randomUUID(), start: arrowStart, end: [lng, lat], memo: memo || "" });
          setArrowStart(null);
        }
      } else if (drawMode === "note") {
        const text = prompt("注記を入力してください");
        if (text) onAddNote({ id: crypto.randomUUID(), position: [lng, lat], text });
      }
    };

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      if (drawMode === "polygon" && polygonPoints.length >= 3) {
        e.preventDefault();
        const name = prompt("ポリゴンの名前を入力してください");
        if (name) {
          const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
          const color = colors[Math.floor(Math.random() * colors.length)];
          onAddPolygon({ id: crypto.randomUUID(), name, coordinates: polygonPoints, color });
        }
        setPolygonPoints([]);
      }
    };

    mapInstance.on("click", handleClick);
    mapInstance.on("dblclick", handleDblClick);

    return () => {
      mapInstance.off("click", handleClick);
      mapInstance.off("dblclick", handleDblClick);
    };
  }, [drawMode, polygonPoints, arrowStart, onAddPolygon, onAddArrow, onAddNote]);

  // --- Cleanup for Draw Mode Change ---
  useEffect(() => {
    if (drawMode !== 'polygon') setPolygonPoints([]);
    if (drawMode !== 'arrow') setArrowStart(null);
  }, [drawMode]);

  // --- Temporary Drawing Visuals ---
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    const sourceId = "drawing-source";
    const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;

    if (polygonPoints.length > 0) {
      const geojson = { type: "LineString" as const, coordinates: polygonPoints };
      if (source) {
        source.setData({ type: "Feature", properties: {}, geometry: geojson });
      } else {
        mapInstance.addSource(sourceId, { type: "geojson", data: { type: "Feature", properties: {}, geometry: geojson } });
        mapInstance.addLayer({ id: "drawing-line", type: "line", source: sourceId, paint: { "line-color": "#3b82f6", "line-width": 2 } });
        mapInstance.addLayer({ id: "drawing-points", type: "circle", source: sourceId, paint: { "circle-radius": 5, "circle-color": "#3b82f6" } });
      }
    } else {
      if (source) {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [polygonPoints]);

  // --- Highlighted Countries Management ---
  useEffect(() => {
    console.log("debug:test")
    const mapInstance = map.current;
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    const newLayerMap = new Map<string, { fill: string; line: string }>();
    highlightedCountries.forEach((hc) => {
      const countryId = (`${hc.yearLabel}-${hc.country.properties.NAME}` || crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, "_");
      const sourceId = `highlighted-source-${countryId}`;
      newLayerMap.set(sourceId, { fill: `highlighted-fill-${countryId}`, line: `highlighted-line-${countryId}` });
    });
    highlightedLayers.current.forEach((layerIds, sourceId) => {
      if (!newLayerMap.has(sourceId)) {
        if (mapInstance.getLayer(layerIds.fill)) mapInstance.removeLayer(layerIds.fill);
        if (mapInstance.getLayer(layerIds.line)) mapInstance.removeLayer(layerIds.line);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      }
    });
    const bounds = new maplibregl.LngLatBounds();
    highlightedCountries.forEach((hc) => {
      const countryId = (`${hc.yearLabel}-${hc.country.properties.NAME}` || crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, "_");
      const sourceId = `highlighted-source-${countryId}`;
      const fillLayerId = `highlighted-fill-${countryId}`;
      const lineLayerId = `highlighted-line-${countryId}`;
      if (!mapInstance.getSource(sourceId)) mapInstance.addSource(sourceId, { type: "geojson", data: hc.country });
      if (!mapInstance.getLayer(fillLayerId)) mapInstance.addLayer({ id: fillLayerId, type: "fill", source: sourceId, paint: { "fill-color": hc.color, "fill-opacity": hc.displayMode === "fill" ? 0.4 : 0 } });
      else mapInstance.setPaintProperty(fillLayerId, "fill-opacity", hc.displayMode === "fill" ? 0.4 : 0);
      if (!mapInstance.getLayer(lineLayerId)) mapInstance.addLayer({ id: lineLayerId, type: "line", source: sourceId, paint: { "line-color": hc.color, "line-width": 1.5 } });
      else mapInstance.setPaintProperty(lineLayerId, "line-color", hc.color);
      const addCoordinatesToBounds = (coordinates: any) => {
        if (!coordinates) return;
        for (const coord of coordinates) {
          if (typeof coord[0] === "number") bounds.extend(coord as [number, number]);
          else addCoordinatesToBounds(coord);
        }
      };
      addCoordinatesToBounds(hc.country.geometry.coordinates);
    });
    highlightedLayers.current = newLayerMap;
    if (!bounds.isEmpty()) mapInstance.fitBounds(bounds, { padding: 100, maxZoom: 6 });
  }, [highlightedCountries]);

  // --- Drawn Polygons Management ---
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    const currentIds = new Set(drawnPolygons.map(p => p.id));
    polygonsOnMap.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        const sourceId = `polygon-${id}`;
        const fillLayerId = `polygon-fill-${id}`;
        const lineLayerId = `polygon-line-${id}`;
        const fillEnter = polygonListeners.current.get(`${fillLayerId}-enter`);
        const fillLeave = polygonListeners.current.get(`${fillLayerId}-leave`);
        const lineEnter = polygonListeners.current.get(`${lineLayerId}-enter`);
        const lineLeave = polygonListeners.current.get(`${lineLayerId}-leave`);
        if (fillEnter) mapInstance.off("mouseenter", fillLayerId, fillEnter);
        if (fillLeave) mapInstance.off("mouseleave", fillLayerId, fillLeave);
        if (lineEnter) mapInstance.off("mouseenter", lineLayerId, lineEnter);
        if (lineLeave) mapInstance.off("mouseleave", lineLayerId, lineLeave);
        polygonListeners.current.delete(`${fillLayerId}-enter`);
        polygonListeners.current.delete(`${fillLayerId}-leave`);
        polygonListeners.current.delete(`${lineLayerId}-enter`);
        polygonListeners.current.delete(`${lineLayerId}-leave`);
        if (mapInstance.getLayer(fillLayerId)) mapInstance.removeLayer(fillLayerId);
        if (mapInstance.getLayer(lineLayerId)) mapInstance.removeLayer(lineLayerId);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
        polygonsOnMap.current.delete(id);
      }
    });
    drawnPolygons.forEach(polygon => {
      const sourceId = `polygon-${polygon.id}`;
      const fillLayerId = `polygon-fill-${polygon.id}`;
      const lineLayerId = `polygon-line-${polygon.id}`;
      const existing = polygonsOnMap.current.get(polygon.id);
      if (!existing) {
        if (!mapInstance.getSource(sourceId)) {
          mapInstance.addSource(sourceId, { type: "geojson", data: { type: "Feature", properties: { name: polygon.name }, geometry: { type: "Polygon", coordinates: [[...polygon.coordinates, polygon.coordinates[0]]] } } });
        }
        if (!mapInstance.getLayer(fillLayerId)) {
          mapInstance.addLayer({ id: fillLayerId, type: "fill", source: sourceId, paint: { "fill-color": polygon.color, "fill-opacity": polygon.displayMode === "fill" ? 0.4 : 0 }, layout: { visibility: polygon.displayMode !== "hidden" ? "visible" : "none" } });
        }
        if (!mapInstance.getLayer(lineLayerId)) {
          mapInstance.addLayer({ id: lineLayerId, type: "line", source: sourceId, paint: { "line-color": polygon.color, "line-width": 2 }, layout: { visibility: polygon.displayMode !== "hidden" ? "visible" : "none" } });
        }
        const createPopup = (e: maplibregl.MapLayerMouseEvent) => {
          const content = e.features?.[0]?.properties?.name as string || "";
          if (!content || !mapInstance) return;
          mapInstance.getCanvas().style.cursor = "pointer";
          popup.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false }).setLngLat(e.lngLat).setHTML(content).addTo(mapInstance);
        };
        const removePopup = () => {
          if (!mapInstance) return;
          mapInstance.getCanvas().style.cursor = "";
          popup.current?.remove();
        };
        mapInstance.on("mouseenter", fillLayerId, createPopup);
        mapInstance.on("mouseleave", fillLayerId, removePopup);
        mapInstance.on("mouseenter", lineLayerId, createPopup);
        mapInstance.on("mouseleave", lineLayerId, removePopup);
        polygonListeners.current.set(`${fillLayerId}-enter`, createPopup);
        polygonListeners.current.set(`${fillLayerId}-leave`, removePopup);
        polygonListeners.current.set(`${lineLayerId}-enter`, createPopup);
        polygonListeners.current.set(`${lineLayerId}-leave`, removePopup);
        polygonsOnMap.current.set(polygon.id, polygon);
      } else if (existing.displayMode !== polygon.displayMode) {
        if (mapInstance.getLayer(fillLayerId)) {
          mapInstance.setLayoutProperty(fillLayerId, "visibility", polygon.displayMode !== "hidden" ? "visible" : "none");
          mapInstance.setPaintProperty(fillLayerId, "fill-opacity", polygon.displayMode === "fill" ? 0.4 : 0);
        }
        if (mapInstance.getLayer(lineLayerId)) {
          mapInstance.setLayoutProperty(lineLayerId, "visibility", polygon.displayMode !== "hidden" ? "visible" : "none");
        }
        polygonsOnMap.current.set(polygon.id, polygon);
      }
    });
  }, [drawnPolygons]);

  // --- Drawn Arrows Management ---
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    const currentIds = new Set(arrows.map(a => a.id));
    arrowsOnMap.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        const sourceId = `arrow-${id}`;
        const layerId = `arrow-line-${id}`;
        const enterListener = arrowListeners.current.get(`${layerId}-enter`);
        const leaveListener = arrowListeners.current.get(`${layerId}-leave`);
        if (enterListener) mapInstance.off("mouseenter", layerId, enterListener);
        if (leaveListener) mapInstance.off("mouseleave", layerId, leaveListener);
        arrowListeners.current.delete(`${layerId}-enter`);
        arrowListeners.current.delete(`${layerId}-leave`);
        if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
        arrowsOnMap.current.delete(id);
      }
    });
    arrows.forEach(arrow => {
      const sourceId = `arrow-${arrow.id}`;
      const layerId = `arrow-line-${arrow.id}`;
      const existing = arrowsOnMap.current.get(arrow.id);
      if (!existing) {
        if (!mapInstance.getSource(sourceId)) {
          mapInstance.addSource(sourceId, { type: "geojson", data: { type: "Feature", properties: { name: arrow.memo || "矢印" }, geometry: { type: "LineString", coordinates: [arrow.start, arrow.end] } } });
        }
        if (!mapInstance.getLayer(layerId)) {
          mapInstance.addLayer({ id: layerId, type: "line", source: sourceId, paint: { "line-color": "#dc2626", "line-width": 3 }, layout: { visibility: arrow.displayMode !== "hidden" ? "visible" : "none" } });
        }
        const createPopup = (e: maplibregl.MapLayerMouseEvent) => {
          const content = e.features?.[0]?.properties?.name as string || "";
          if (!content || !mapInstance) return;
          mapInstance.getCanvas().style.cursor = "pointer";
          popup.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false }).setLngLat(e.lngLat).setHTML(content).addTo(mapInstance);
        };
        const removePopup = () => {
          if (!mapInstance) return;
          mapInstance.getCanvas().style.cursor = "";
          popup.current?.remove();
        };
        mapInstance.on("mouseenter", layerId, createPopup);
        mapInstance.on("mouseleave", layerId, removePopup);
        arrowListeners.current.set(`${layerId}-enter`, createPopup);
        arrowListeners.current.set(`${layerId}-leave`, removePopup);
        arrowsOnMap.current.set(arrow.id, arrow);
      } else if (existing.displayMode !== arrow.displayMode) {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.setLayoutProperty(layerId, "visibility", arrow.displayMode !== "hidden" ? "visible" : "none");
        }
        arrowsOnMap.current.set(arrow.id, arrow);
      }
    });
  }, [arrows]);

  // --- Drawn Notes Management ---
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    const currentIds = new Set(notes.map(n => n.id));
    notesOnMap.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        const sourceId = `note-${id}`;
        const circleLayerId = `note-circle-${id}`;
        const textLayerId = `note-text-${id}`;
        const circleEnter = noteListeners.current.get(`${circleLayerId}-enter`);
        const circleLeave = noteListeners.current.get(`${circleLayerId}-leave`);
        const textEnter = noteListeners.current.get(`${textLayerId}-enter`);
        const textLeave = noteListeners.current.get(`${textLayerId}-leave`);
        if (circleEnter) mapInstance.off("mouseenter", circleLayerId, circleEnter);
        if (circleLeave) mapInstance.off("mouseleave", circleLayerId, circleLeave);
        if (textEnter) mapInstance.off("mouseenter", textLayerId, textEnter);
        if (textLeave) mapInstance.off("mouseleave", textLayerId, textLeave);
        noteListeners.current.delete(`${circleLayerId}-enter`);
        noteListeners.current.delete(`${circleLayerId}-leave`);
        noteListeners.current.delete(`${textLayerId}-enter`);
        noteListeners.current.delete(`${textLayerId}-leave`);
        if (mapInstance.getLayer(circleLayerId)) mapInstance.removeLayer(circleLayerId);
        if (mapInstance.getLayer(textLayerId)) mapInstance.removeLayer(textLayerId);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
        notesOnMap.current.delete(id);
      }
    });
    notes.forEach(note => {
      const sourceId = `note-${note.id}`;
      const circleLayerId = `note-circle-${note.id}`;
      const textLayerId = `note-text-${note.id}`;
      const existing = notesOnMap.current.get(note.id);
      if (!existing) {
        if (!mapInstance.getSource(sourceId)) {
          mapInstance.addSource(sourceId, { type: "geojson", data: { type: "Feature", properties: { name: note.text }, geometry: { type: "Point", coordinates: note.position } } });
        }
        if (!mapInstance.getLayer(circleLayerId)) {
          mapInstance.addLayer({ id: circleLayerId, type: "circle", source: sourceId, paint: { "circle-radius": 5, "circle-color": "#059669" }, layout: { visibility: note.displayMode !== "hidden" ? "visible" : "none" } });
        }
        if (!mapInstance.getLayer(textLayerId)) {
          mapInstance.addLayer({ id: textLayerId, type: "symbol", source: sourceId, layout: { "text-field": note.text, "text-offset": [0, 1.2], "text-anchor": "top", "text-size": 12, visibility: note.displayMode !== "hidden" ? "visible" : "none" }, paint: { "text-color": "#000", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
        }
        const createPopup = (e: maplibregl.MapLayerMouseEvent) => {
          const content = e.features?.[0]?.properties?.name as string || "";
          if (!content || !mapInstance) return;
          mapInstance.getCanvas().style.cursor = "pointer";
          popup.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false }).setLngLat(e.lngLat).setHTML(content).addTo(mapInstance);
        };
        const removePopup = () => {
          if (!mapInstance) return;
          mapInstance.getCanvas().style.cursor = "";
          popup.current?.remove();
        };
        mapInstance.on("mouseenter", circleLayerId, createPopup);
        mapInstance.on("mouseleave", circleLayerId, removePopup);
        mapInstance.on("mouseenter", textLayerId, createPopup);
        mapInstance.on("mouseleave", textLayerId, removePopup);
        noteListeners.current.set(`${circleLayerId}-enter`, createPopup);
        noteListeners.current.set(`${circleLayerId}-leave`, removePopup);
        noteListeners.current.set(`${textLayerId}-enter`, createPopup);
        noteListeners.current.set(`${textLayerId}-leave`, removePopup);
        notesOnMap.current.set(note.id, note);
      } else if (existing.displayMode !== note.displayMode) {
        if (mapInstance.getLayer(circleLayerId)) {
          mapInstance.setLayoutProperty(circleLayerId, "visibility", note.displayMode !== "hidden" ? "visible" : "none");
        }
        if (mapInstance.getLayer(textLayerId)) {
          mapInstance.setLayoutProperty(textLayerId, "visibility", note.displayMode !== "hidden" ? "visible" : "none");
        }
        notesOnMap.current.set(note.id, note);
      }
    });
  }, [notes]);

  return (
    <>
      <div ref={mapContainer} style={{ width: "100%", height: "100%", cursor: drawMode !== "none" ? "crosshair" : "grab" }} />
      {drawMode === "polygon" && polygonPoints.length > 0 && (<div className="map-overlay-message">頂点: {polygonPoints.length}個 | ダブルクリックで完成</div>)}
      {drawMode === "arrow" && arrowStart && (<div className="map-overlay-message">終点をクリックしてください</div>)}
    </>
  );
}

