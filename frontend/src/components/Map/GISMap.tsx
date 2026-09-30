import React, { useEffect, useRef, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { Map as MapLibreMap, Marker, Popup, LngLatBounds, GeoJSONSource } from "maplibre-gl";
import "./GISMap.css";

export interface CameraMarkerData {
  cameraId: string;
  name: string;
  location?: string;
  latitude: number | string;
  longitude: number | string;
  status: "ONLINE" | "OFFLINE";
  direction?: string;
  detectionCount?: number;
  lastDetection?: string;
}

export interface TrajectoryPointData {
  cameraId: string;
  cameraName?: string;
  timestamp: string | Date;
  latitude: number | string;
  longitude: number | string;
  direction?: string;
  confidence?: number;
}

export interface AlertMarkerData {
  plate: string;
  type: string;
  cameraId: string;
  latitude: number | string;
  longitude: number | string;
  timestamp: string | Date;
}

interface GISMapProps {
  cameras?: CameraMarkerData[];
  trajectoryPoints?: TrajectoryPointData[];
  alerts?: AlertMarkerData[];
  selectedCameraId?: string;
  onCameraClick?: (cameraId: string) => void;
  showDensityLayer?: boolean;
  height?: string;
}

export const GISMap: React.FC<GISMapProps> = ({
  cameras = [],
  trajectoryPoints = [],
  alerts = [],
  selectedCameraId,
  onCameraClick,
  showDensityLayer = false,
  height = "520px",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const isLoadedRef = useRef<boolean>(false);
  const markersRef = useRef<Marker[]>([]);

  // Persistent reference to latest props to prevent stale closure bugs
  const propsRef = useRef({
    cameras,
    trajectoryPoints,
    alerts,
    selectedCameraId,
    onCameraClick,
    showDensityLayer,
  });

  propsRef.current = {
    cameras,
    trajectoryPoints,
    alerts,
    selectedCameraId,
    onCameraClick,
    showDensityLayer,
  };

  // Synchronously update map layers, GeoJSON trajectory, and HTML markers
  const renderMap = useCallback(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    const currentProps = propsRef.current;

    // 1. Clear previous HTML markers
    markersRef.current.forEach((m: Marker) => m.remove());
    markersRef.current = [];

    const validCameraCoords: [number, number][] = [];

    // 2. Render Camera Markers (Deduplicated: 1 marker per unique camera)
    const uniqueCamerasMap = new Map<string, CameraMarkerData>();
    (currentProps.cameras || []).forEach((cam) => {
      if (cam.cameraId && !uniqueCamerasMap.has(cam.cameraId)) {
        uniqueCamerasMap.set(cam.cameraId, cam);
      }
    });

    uniqueCamerasMap.forEach((cam) => {
      const lng = Number(cam.longitude);
      const lat = Number(cam.latitude);
      if (isNaN(lng) || isNaN(lat) || (lng === 0 && lat === 0)) return;

      const isSelected = currentProps.selectedCameraId === cam.cameraId;
      const statusLower = (cam.status || "ONLINE").toLowerCase();

      const el = document.createElement("div");
      el.className = `camera-marker ${statusLower} ${isSelected ? "selected" : ""}`;
      el.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
          <circle cx="12" cy="13" r="3"></circle>
        </svg>
        <span class="status-indicator"></span>
      `;

      const popup = new Popup({ offset: 18, closeButton: false }).setHTML(`
        <div class="gis-popup-header">
          <span style="font-weight: 700; color: #0f172a;">${cam.cameraId}</span>
          <span class="gis-popup-status ${statusLower}">${cam.status || "ONLINE"}</span>
        </div>
        <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${cam.name}</div>
        <div class="gis-popup-row">
          <span class="gis-popup-label">Location:</span>
          <span style="color: #334155; font-weight: 500;">${cam.location || "Urban Sector"}</span>
        </div>
        <div class="gis-popup-row">
          <span class="gis-popup-label">Direction:</span>
          <span style="color: #334155;">${cam.direction || "NORTH"}</span>
        </div>
        <div class="gis-popup-row">
          <span class="gis-popup-label">Total Detections:</span>
          <span style="color: #2563eb; font-weight: 600;">${cam.detectionCount ?? 0}</span>
        </div>
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9; text-align: right;">
          <a href="/cameras?cameraId=${cam.cameraId}" style="font-size: 11px; color: #2563eb; text-decoration: none; font-weight: 600;">
            View Camera Details &rarr;
          </a>
        </div>
      `);

      el.addEventListener("click", () => {
        if (currentProps.onCameraClick) {
          currentProps.onCameraClick(cam.cameraId);
        }
      });

      const marker = new Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      validCameraCoords.push([lng, lat]);
    });

    // 3. Render Chronological Vehicle Trajectory
    const rawTrajectory = currentProps.trajectoryPoints || [];
    // Sort strictly chronological ASC
    const sortedTrajectory = rawTrajectory
      .map((p) => ({
        ...p,
        lng: Number(p.longitude),
        lat: Number(p.latitude),
        time: new Date(p.timestamp).getTime(),
      }))
      .filter((p) => !isNaN(p.lng) && !isNaN(p.lat) && (p.lng !== 0 || p.lat !== 0))
      .sort((a, b) => a.time - b.time);

    // Build unique camera movements for the trajectory LineString
    const lineCoords: [number, number][] = [];
    sortedTrajectory.forEach((pt) => {
      const prev = lineCoords[lineCoords.length - 1];
      // Consecutive identical coordinates produce 0-length loops; skip duplicates in line coordinates
      if (!prev || prev[0] !== pt.lng || prev[1] !== pt.lat) {
        lineCoords.push([pt.lng, pt.lat]);
      }
    });

    // GeoJSON Feature
    const hasValidLine = lineCoords.length >= 2;
    const trajectoryGeoJSON = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: hasValidLine ? lineCoords : [],
      },
    };

    // Ensure MapLibre source exists and update data
    const trajSourceId = "vehicle-trajectory";
    const trajLineLayerId = "vehicle-trajectory-line";
    const trajCasingLayerId = "vehicle-trajectory-casing";

    const trajSource = map.getSource(trajSourceId) as GeoJSONSource;
    if (trajSource) {
      trajSource.setData(trajectoryGeoJSON);
    } else {
      map.addSource(trajSourceId, {
        type: "geojson",
        data: trajectoryGeoJSON,
      });
    }

    // Ensure Casing layer exists (white outline for maximum visibility on all maps)
    if (!map.getLayer(trajCasingLayerId)) {
      map.addLayer({
        id: trajCasingLayerId,
        type: "line",
        source: trajSourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": 6,
          "line-opacity": 0.9,
        },
      });
    }

    // Ensure Line layer exists (bold, vibrant orange #ea580c)
    if (!map.getLayer(trajLineLayerId)) {
      map.addLayer({
        id: trajLineLayerId,
        type: "line",
        source: trajSourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ea580c",
          "line-width": 4,
          "line-opacity": 1.0,
        },
      });
    }

    // 4. Render Compact, Non-Overlapping Observation Sequence Markers
    // Group consecutive observations at the same camera location
    interface ObservationGroup {
      cameraId: string;
      cameraName: string;
      lng: number;
      lat: number;
      observations: {
        timestamp: Date;
        confidence?: number;
      }[];
      stepNumber: number;
    }

    const observationGroups: ObservationGroup[] = [];
    sortedTrajectory.forEach((pt) => {
      const prev = observationGroups[observationGroups.length - 1];
      if (prev && prev.cameraId === pt.cameraId) {
        prev.observations.push({
          timestamp: new Date(pt.timestamp),
          confidence: pt.confidence,
        });
      } else {
        observationGroups.push({
          cameraId: pt.cameraId,
          cameraName: pt.cameraName || pt.cameraId,
          lng: pt.lng,
          lat: pt.lat,
          observations: [
            {
              timestamp: new Date(pt.timestamp),
              confidence: pt.confidence,
            },
          ],
          stepNumber: observationGroups.length + 1,
        });
      }
    });

    // Create compact observation badge offset at the top-right of camera marker
    observationGroups.forEach((group) => {
      const el = document.createElement("div");
      el.className = "trajectory-marker";
      el.innerText = `${group.stepNumber}`;

      const firstTime = group.observations[0].timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const obsCount = group.observations.length;
      const countLabel = obsCount === 1 ? "1 Observation" : `${obsCount} Observations at Station`;

      const popup = new Popup({ offset: 18, closeButton: false }).setHTML(`
        <div class="gis-popup-header" style="color: #c2410c;">
          <span>Checkpoint #${group.stepNumber}</span>
          <span style="font-size: 10px; background: #fff7ed; padding: 2px 6px; border-radius: 4px; border: 1px solid #ffedd5;">${countLabel}</span>
        </div>
        <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${group.cameraName}</div>
        <div class="gis-popup-row">
          <span class="gis-popup-label">Camera ID:</span>
          <span style="color: #0f172a; font-weight: 600;">${group.cameraId}</span>
        </div>
        <div class="gis-popup-row">
          <span class="gis-popup-label">Initial Sighting:</span>
          <span style="color: #334155; font-family: var(--font-mono);">${firstTime}</span>
        </div>
        <div class="gis-popup-row">
          <span class="gis-popup-label">Confidence:</span>
          <span style="color: #16a34a; font-weight: 600;">
            ${group.observations[0].confidence ? (group.observations[0].confidence * 100).toFixed(1) + "%" : "Verified"}
          </span>
        </div>
      `);

      // offset [14, -14] shifts badge to top-right corner of camera icon to completely prevent overlap
      const marker = new Marker({ element: el, offset: [14, -14] })
        .setLngLat([group.lng, group.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 5. Render Alerts
    (currentProps.alerts || []).forEach((alert) => {
      const lng = Number(alert.longitude);
      const lat = Number(alert.latitude);
      if (isNaN(lng) || isNaN(lat) || (lng === 0 && lat === 0)) return;

      const el = document.createElement("div");
      el.className = "alert-marker";
      el.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;

      const popup = new Popup({ offset: 18, closeButton: false }).setHTML(`
        <div class="gis-popup-header" style="color: #dc2626;">
          <span>ALERT TRIGGERED</span>
          <span>${alert.type}</span>
        </div>
        <div style="font-weight: 700; color: #0f172a; font-size: 15px; margin: 4px 0;">${alert.plate}</div>
        <div class="gis-popup-row">
          <span class="gis-popup-label">Camera:</span>
          <span style="color: #0f172a; font-weight: 600;">${alert.cameraId}</span>
        </div>
      `);

      const marker = new Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 6. Update Traffic Density Layer
    const densitySource = map.getSource("density-points") as GeoJSONSource;
    if (densitySource) {
      if (currentProps.showDensityLayer && (currentProps.cameras || []).length > 0) {
        densitySource.setData({
          type: "FeatureCollection",
          features: (currentProps.cameras || [])
            .filter((c) => !isNaN(Number(c.longitude)) && !isNaN(Number(c.latitude)))
            .map((c) => ({
              type: "Feature",
              properties: { detectionCount: c.detectionCount || 0 },
              geometry: {
                type: "Point",
                coordinates: [Number(c.longitude), Number(c.latitude)],
              },
            })),
        });
        map.setLayoutProperty("density-heatmap-layer", "visibility", "visible");
      } else {
        map.setLayoutProperty("density-heatmap-layer", "visibility", "none");
      }
    }

    // 7. Dynamic Viewport Framing:
    // If trajectory line points exist, fit trajectory bounds. Otherwise fit cameras.
    const targetCoords = lineCoords.length > 0 ? lineCoords : validCameraCoords;

    if (targetCoords.length === 1) {
      map.easeTo({ center: targetCoords[0], zoom: 13.5, duration: 600 });
    } else if (targetCoords.length > 1) {
      const fitBounds = new LngLatBounds();
      targetCoords.forEach((coord) => fitBounds.extend(coord));
      map.fitBounds(fitBounds, { padding: 70, maxZoom: 14.5, duration: 600 });
    }
  }, []);

  // Initialize MapLibre ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center from camera records (Bhopal, MP: [77.4125, 23.2845])
    const defaultCenter: [number, number] = [77.4125, 23.2845];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-layer",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: defaultCenter,
      zoom: 12.5,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      isLoadedRef.current = true;

      // Add Traffic Density Circles Source & Layer
      map.addSource("density-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "density-heatmap-layer",
        type: "circle",
        source: "density-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "detectionCount"],
            0, 15,
            5, 25,
            20, 45,
          ],
          "circle-color": "#2563eb",
          "circle-opacity": 0.2,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#2563eb",
        },
      });

      // Synchronize and render map layers and markers
      renderMap();
      map.resize();
    });

    const handleResize = () => {
      map.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      isLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE on mount; NEVER re-initialize map instance on prop updates

  // Trigger renderMap when data changes without re-creating map instance
  useEffect(() => {
    if (mapRef.current && isLoadedRef.current) {
      renderMap();
    }
  }, [cameras, trajectoryPoints, alerts, selectedCameraId, showDensityLayer, renderMap]);

  return (
    <div className="gis-map-container" style={{ height }}>
      <div ref={mapContainerRef} className="gis-map" />
      <div className="gis-map-legend">
        <div className="gis-legend-item">
          <div className="gis-legend-dot" style={{ background: "#2563eb", border: "1px solid #ffffff" }}></div>
          <span>CCTV Camera Site</span>
        </div>
        {trajectoryPoints.length > 0 && (
          <div className="gis-legend-item">
            <div className="gis-legend-dot" style={{ background: "#ea580c" }}></div>
            <span>Vehicle Observation Checkpoint</span>
          </div>
        )}
        {alerts.length > 0 && (
          <div className="gis-legend-item">
            <div className="gis-legend-dot" style={{ background: "#dc2626" }}></div>
            <span>Alert Event</span>
          </div>
        )}
      </div>
    </div>
  );
};
