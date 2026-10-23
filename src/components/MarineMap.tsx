import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { BoatState, AlertState, PotentialFishingZone } from '../types/marine';
import { IMBL_COORDINATES, NAV_LANDMARKS } from '../data/imblData';
import { Layers, Crosshair, Anchor, ShieldAlert, Compass } from 'lucide-react';

interface MarineMapProps {
  boat: BoatState;
  fleetBoats: BoatState[];
  alert: AlertState;
  pfzZones: PotentialFishingZone[];
  wakeHistory: [number, number][];
  onBoatPositionChange: (lat: number, lng: number) => void;
  showPfz: boolean;
  showFleet: boolean;
  showBuffers: boolean;
}

export const MarineMap: React.FC<MarineMapProps> = ({
  boat,
  fleetBoats,
  alert,
  pfzZones,
  wakeHistory,
  onBoatPositionChange,
  showPfz,
  showFleet,
  showBuffers,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const boatMarkerRef = useRef<L.Marker | null>(null);
  const headingConeRef = useRef<L.Polygon | null>(null);
  const safeReturnLineRef = useRef<L.Polyline | null>(null);
  const borderDistanceLineRef = useRef<L.Polyline | null>(null);
  const wakePolylineRef = useRef<L.Polyline | null>(null);
  const fleetMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const pfzGroupRef = useRef<L.LayerGroup | null>(null);
  const bufferGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center around Palk Bay / Dhanushkodi / Katchatheevu
    const map = L.map(mapContainerRef.current, {
      center: [9.32, 79.40],
      zoom: 10,
      minZoom: 8,
      maxZoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    // Standard reliable OSM basemap + CartoDB fallback
    const baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Call invalidateSize after container renders
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
    setTimeout(() => {
      map.invalidateSize();
    }, 600);

    // Add nautical open sea depth lines / open sea marks if needed
    L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      maxZoom: 18,
      opacity: 0.7,
    }).addTo(map);

    // IMBL Line coordinates
    const imblLatLngs = IMBL_COORDINATES.map(p => [p.lat, p.lng] as [number, number]);

    // Draw International Boundary Line (IMBL)
    L.polyline(imblLatLngs, {
      color: '#ef4444',
      weight: 3.5,
      dashArray: '8, 6',
      opacity: 0.9,
    }).addTo(map).bindPopup(`
      <div style="font-family: inherit; font-size: 12px; color: #f8fafc; min-width: 200px;">
        <strong style="color: #ef4444; font-size: 13px;">INTERNATIONAL MARITIME BOUNDARY LINE (IMBL)</strong><br/>
        <span style="color: #38bdf8; font-weight: 600;">1974 Historic Indo-Sri Lanka Agreement</span><br/>
        <span style="color: #94a3b8; font-size: 11px;">6 Key Boundary Positions (Palk Strait & Palk Bay)</span><br/>
        <span style="color: #f59e0b; font-weight: bold;">DO NOT CROSS WITHOUT CLEARANCE</span>
      </div>
    `);

    // Draw IMBL boundary points
    IMBL_COORDINATES.forEach((bp, index) => {
      const circle = L.circleMarker([bp.lat, bp.lng], {
        radius: 5,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      circle.bindTooltip(`
        <div style="font-family: monospace;">
          <strong style="color: #f87171;">Position ${index + 1} (1974 Agreement)</strong><br/>
          <span>${bp.dmsNotation || bp.name}</span><br/>
          <span style="color: #94a3b8;">${bp.lat.toFixed(4)}°N, ${bp.lng.toFixed(4)}°E</span>
        </div>
      `, {
        permanent: false,
        direction: 'right',
        className: 'bg-slate-900 text-slate-200 text-xs border border-slate-700 px-2 py-1 rounded shadow',
      });
    });

    // Add Sri Lanka side warning polygon area (East of 1974 treaty line)
    const sriLankaWaterBounds: [number, number][] = [
      [10.15, 80.20],
      ...imblLatLngs,
      [9.05, 80.20],
      [10.15, 80.20],
    ];
    L.polygon(sriLankaWaterBounds, {
      color: '#dc2626',
      weight: 1,
      dashArray: '4, 4',
      fillColor: '#ef4444',
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(map);

    // Add Coastal Landmarks & Coast Guard stations
    NAV_LANDMARKS.forEach(landmark => {
      const isInd = landmark.country === 'IND';
      const iconHtml = `
        <div style="
          background-color: ${isInd ? '#0284c7' : '#991b1b'};
          color: white;
          padding: 3px 6px;
          border-radius: 4px;
          border: 1px solid ${isInd ? '#38bdf8' : '#f87171'};
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          ${isInd ? '⚓' : '⚠️'} ${landmark.name}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-landmark-icon',
        iconAnchor: [30, 10],
      });

      L.marker([landmark.lat, landmark.lng], { icon: customIcon }).addTo(map).bindPopup(`
        <div style="font-size: 12px; color: #f8fafc;">
          <strong style="color: ${isInd ? '#38bdf8' : '#f87171'};">${landmark.name}</strong><br/>
          <span style="color: #cbd5e1;">${landmark.nameTa}</span><br/>
          <span style="color: #94a3b8; font-size: 11px;">Jurisdiction: ${isInd ? 'India (Tamil Nadu)' : 'Sri Lanka'}</span>
        </div>
      `);
    });

    // Setup Layer Groups
    bufferGroupRef.current = L.layerGroup().addTo(map);
    fleetMarkersGroupRef.current = L.layerGroup().addTo(map);
    pfzGroupRef.current = L.layerGroup().addTo(map);

    // Wake history line
    wakePolylineRef.current = L.polyline([], {
      color: '#38bdf8',
      weight: 2,
      dashArray: '3, 6',
      opacity: 0.6,
    }).addTo(map);

    // Allow user to click anywhere on map to reposition boat (for instant testing of boundary warnings)
    map.on('click', (e: L.LeafletMouseEvent) => {
      onBoatPositionChange(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update buffer zones (2km Yellow, 1km Orange, 500m Red parallel lines / buffers)
  useEffect(() => {
    if (!bufferGroupRef.current) return;
    bufferGroupRef.current.clearLayers();

    if (!showBuffers) return;

    // Buffer bands parallel to IMBL into Indian waters (approx offset ~0.009 deg ≈ 1km)
    const offsets = [
      { meters: 2000, deg: 0.018, color: '#facc15', label: '2.0 km Yellow Alert Zone' },
      { meters: 1000, deg: 0.009, color: '#fb923c', label: '1.0 km Orange Alert Zone' },
      { meters: 500, deg: 0.0045, color: '#f87171', label: '500m Red Critical Zone' },
    ];

    offsets.forEach(buf => {
      const bufferCoords: [number, number][] = IMBL_COORDINATES.map(p => {
        // Shift westwards (decrease longitude) towards India
        return [p.lat, p.lng - buf.deg];
      });

      const line = L.polyline(bufferCoords, {
        color: buf.color,
        weight: 1.5,
        dashArray: '6, 6',
        opacity: 0.7,
      });

      line.bindTooltip(buf.label, {
        sticky: true,
        className: 'bg-slate-900 text-slate-200 text-xs px-2 py-1 border border-slate-700 rounded shadow',
      });

      bufferGroupRef.current?.addLayer(line);
    });
  }, [showBuffers]);

  // Update Potential Fishing Zones (PFZs)
  useEffect(() => {
    if (!pfzGroupRef.current) return;
    pfzGroupRef.current.clearLayers();

    if (!showPfz) return;

    pfzZones.forEach(zone => {
      // Circle representing PFZ thermal/chlorophyll eddy
      const eddy = L.circle([zone.lat, zone.lng], {
        radius: 3500,
        color: '#10b981',
        weight: 2,
        fillColor: '#34d399',
        fillOpacity: 0.18,
      });

      const iconHtml = `
        <div style="
          background-color: #064e3b;
          color: #a7f3d0;
          border: 1px solid #10b981;
          border-radius: 9999px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          🐟 ${zone.name.split(' ')[0]} (${zone.catchProbabilityPercent}%)
        </div>
      `;

      const marker = L.marker([zone.lat, zone.lng], {
        icon: L.divIcon({
          html: iconHtml,
          className: 'pfz-tag',
          iconAnchor: [20, 10],
        }),
      });

      const popupContent = `
        <div style="font-size: 12px; color: #f8fafc; line-height: 1.4;">
          <div style="font-weight: 800; color: #34d399; font-size: 13px;">🐟 ${zone.name}</div>
          <div style="font-family: inherit; color: #94a3b8; font-size: 11px;">${zone.nameTa}</div>
          <hr style="border-color: #334155; margin: 6px 0;" />
          <div><strong>Catch Probability:</strong> <span style="color: #34d399; font-weight: bold;">${zone.catchProbabilityPercent}%</span></div>
          <div><strong>Target Species:</strong> ${zone.targetSpecies.join(', ')}</div>
          <div><strong>Depth / Sea Temp:</strong> ${zone.depthMeters}m | ${zone.surfaceTempC}°C</div>
          <div><strong>Distance to IMBL:</strong> <span style="color: #38bdf8;">${zone.safeDistanceToIMBLKm} km</span> (Safe in Indian waters)</div>
          <div style="margin-top: 4px; font-size: 11px; color: #cbd5e1;"><strong>Advisory:</strong> ${zone.advisedRoute}</div>
        </div>
      `;

      eddy.bindPopup(popupContent);
      marker.bindPopup(popupContent);

      pfzGroupRef.current?.addLayer(eddy);
      pfzGroupRef.current?.addLayer(marker);
    });
  }, [showPfz, pfzZones]);

  // Update Fleet Boats
  useEffect(() => {
    if (!fleetMarkersGroupRef.current) return;
    fleetMarkersGroupRef.current.clearLayers();

    if (!showFleet) return;

    fleetBoats.forEach(fb => {
      // Calculate distance from primary boat
      const distKm = (Math.hypot(fb.lat - boat.lat, (fb.lng - boat.lng) * Math.cos(boat.lat * Math.PI / 180)) * 111).toFixed(1);

      const fleetIconHtml = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 30px;
            height: 30px;
            background: #082f49;
            border: 2px solid #38bdf8;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #38bdf8;
            font-size: 13px;
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
            transform: rotate(${fb.cog}deg);
          ">
            ▲
          </div>
          <div style="
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid #38bdf8;
            border-radius: 4px;
            padding: 1px 4px;
            font-size: 9px;
            font-weight: bold;
            color: #bae6fd;
            white-space: nowrap;
            margin-top: 2px;
          ">
            ${fb.name.split(' ')[0]} (${distKm}km)
          </div>
        </div>
      `;

      const marker = L.marker([fb.lat, fb.lng], {
        icon: L.divIcon({
          html: fleetIconHtml,
          className: 'fleet-boat-marker',
          iconAnchor: [30, 20],
        }),
      });

      marker.bindPopup(`
        <div style="font-size: 12px; color: #f8fafc; line-height: 1.4;">
          <div style="font-weight: bold; color: #38bdf8; font-size: 13px;">⛵ ${fb.name}</div>
          <div style="color: #94a3b8; font-size: 11px;">${fb.regNumber}</div>
          <hr style="border-color: #334155; margin: 4px 0;" />
          <div><strong>Distance:</strong> <span style="color: #38bdf8; font-weight: bold;">${distKm} km from your vessel</span></div>
          <div><strong>Speed / Heading:</strong> ${fb.sog} kts | ${fb.cog}°</div>
          <div><strong>Skipper:</strong> ${fb.skipperName}</div>
          <div><strong>Crew:</strong> ${fb.crewCount} Members | <strong>Port:</strong> ${fb.homePort}</div>
          <div style="color: #34d399; font-size: 10px; margin-top: 2px;">LoRa Link: ${fb.loraSignalRssi} dBm (Active)</div>
        </div>
      `);

      fleetMarkersGroupRef.current?.addLayer(marker);
    });
  }, [showFleet, fleetBoats, boat.lat, boat.lng]);

  // Update Wake History
  useEffect(() => {
    if (wakePolylineRef.current && wakeHistory.length > 0) {
      wakePolylineRef.current.setLatLngs(wakeHistory);
    }
  }, [wakeHistory]);

  // Update Primary Boat Marker & Guidance Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Get color based on alert level
    const alertColors = {
      SAFE: '#10b981',
      YELLOW: '#facc15',
      ORANGE: '#fb923c',
      RED: '#ef4444',
      BREACH: '#e11d48',
    };
    const ringColor = alertColors[alert.level];

    // Create or update boat marker
    const boatIconHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing alert ring -->
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid ${ringColor};
          background-color: ${ringColor}22;
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <!-- Vessel Ship Center -->
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          background: #090d16;
          border: 2.5px solid ${ringColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px ${ringColor}aa;
          transform: rotate(${boat.cog}deg);
        ">
          <!-- Directional bow pointer -->
          <div style="
            position: absolute;
            top: -6px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 8px solid ${ringColor};
          "></div>
          <span style="font-size: 14px;">🚢</span>
        </div>
      </div>
    `;

    const boatIcon = L.divIcon({
      html: boatIconHtml,
      className: 'primary-boat-marker',
      iconAnchor: [22, 22],
    });

    if (!boatMarkerRef.current) {
      boatMarkerRef.current = L.marker([boat.lat, boat.lng], {
        icon: boatIcon,
        zIndexOffset: 1000,
        draggable: true,
      }).addTo(map);

      // Drag boat to test coordinates directly
      boatMarkerRef.current.on('dragend', (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        onBoatPositionChange(position.lat, position.lng);
      });
    } else {
      boatMarkerRef.current.setLatLng([boat.lat, boat.lng]);
      boatMarkerRef.current.setIcon(boatIcon);
    }

    // Draw Radar Heading Cone (5 NM range ahead of boat)
    const coneDistance = 0.035; // ~2 NM
    const halfAngle = 20; // 40 deg field of view
    const radCenter = (boat.cog * Math.PI) / 180;
    const radL = ((boat.cog - halfAngle) * Math.PI) / 180;
    const radR = ((boat.cog + halfAngle) * Math.PI) / 180;

    const conePoints: [number, number][] = [
      [boat.lat, boat.lng],
      [boat.lat + coneDistance * Math.cos(radL), boat.lng + coneDistance * Math.sin(radL)],
      [boat.lat + coneDistance * 1.15 * Math.cos(radCenter), boat.lng + coneDistance * 1.15 * Math.sin(radCenter)],
      [boat.lat + coneDistance * Math.cos(radR), boat.lng + coneDistance * Math.sin(radR)],
    ];

    if (!headingConeRef.current) {
      headingConeRef.current = L.polygon(conePoints, {
        color: ringColor,
        weight: 1,
        fillColor: ringColor,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
    } else {
      headingConeRef.current.setLatLngs(conePoints);
      headingConeRef.current.setStyle({
        color: ringColor,
        fillColor: ringColor,
      });
    }

    // Distance line to closest IMBL border segment
    const borderLinePoints: [number, number][] = [
      [boat.lat, boat.lng],
      [alert.closestPoint.lat, alert.closestPoint.lng],
    ];

    if (!borderDistanceLineRef.current) {
      borderDistanceLineRef.current = L.polyline(borderLinePoints, {
        color: '#ef4444',
        weight: 2,
        dashArray: '4, 4',
        opacity: 0.8,
      }).addTo(map);
    } else {
      borderDistanceLineRef.current.setLatLngs(borderLinePoints);
    }

    // Safe Return Trajectory Guidance Line (Green vector pointing back to Indian waters)
    if (alert.level !== 'SAFE') {
      const returnDistDeg = (alert.safeReturnDistanceMeters / 1000) / 111; // degrees approx
      const returnRad = (alert.safeReturnBearing * Math.PI) / 180;
      const returnTarget: [number, number] = [
        boat.lat + returnDistDeg * Math.cos(returnRad),
        boat.lng + returnDistDeg * Math.sin(returnRad),
      ];

      const returnLinePoints: [number, number][] = [
        [boat.lat, boat.lng],
        returnTarget,
      ];

      if (!safeReturnLineRef.current) {
        safeReturnLineRef.current = L.polyline(returnLinePoints, {
          color: '#10b981',
          weight: 3.5,
          opacity: 0.9,
        }).addTo(map);
      } else {
        safeReturnLineRef.current.setLatLngs(returnLinePoints);
        safeReturnLineRef.current.setStyle({ opacity: 0.9 });
      }
    } else if (safeReturnLineRef.current) {
      safeReturnLineRef.current.setStyle({ opacity: 0 });
    }
  }, [boat, alert, onBoatPositionChange]);

  // Recenter map on boat
  const handleRecenter = () => {
    mapInstanceRef.current?.setView([boat.lat, boat.lng], 11, { animate: true });
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[600px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px]" style={{ minHeight: '520px', height: '100%' }} />

      {/* Floating Tactical Overlay & Map Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
        {/* Vessel Position Pill */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 shadow-xl flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-bold text-white tracking-wide">{boat.name.split(' ')[0]}</span>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="text-[11px] font-mono-num text-cyan-300">
            {boat.lat.toFixed(4)}°N, {boat.lng.toFixed(4)}°E
          </div>
          <button
            onClick={handleRecenter}
            title="Recenter on Boat"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tip for Interactive Testing */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[11px] text-slate-400 px-2.5 py-1 rounded-lg">
          <Anchor className="w-3 h-3 text-cyan-400" />
          <span>Click anywhere on water or drag boat to test alerts</span>
        </div>
      </div>

      {/* Advisory Floating Badge when Border is Breached */}
      {alert.level === 'BREACH' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-rose-950/95 border-2 border-red-500 shadow-2xl shadow-red-950 rounded-2xl p-2.5 flex items-center gap-2.5 backdrop-blur-md animate-pulse max-w-sm sm:max-w-md text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0"></span>
          <div className="text-xs text-white font-bold leading-tight">
            <span>🚨 BORDER BREACH ALERT: </span>
            <span className="text-amber-200">Manually steer course {alert.safeReturnBearing}° {alert.safeReturnDirectionEn} back into Indian waters</span>
          </div>
        </div>
      )}

      {/* Map Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl text-[11px] text-slate-300 flex flex-col gap-1.5 max-w-xs">
        <div className="flex items-center justify-between font-bold text-white text-xs border-b border-slate-800 pb-1">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            Nautical Legend
          </span>
          <span className="text-[10px] text-slate-400">Palk Strait / Bay</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500"></span>
            <span>IMBL Treaty Line</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-yellow-400"></span>
            <span>2 km Warning Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-orange-400"></span>
            <span>1 km Alert Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-red-400"></span>
            <span>500m Critical Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Potential Fish Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-emerald-400"></span>
            <span>Safe Return Vector</span>
          </div>
        </div>
      </div>

      {/* Bearing Compass Indicator (Top Right) */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2 shadow-xl flex items-center gap-2">
        <Compass className="w-4 h-4 text-cyan-400" />
        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Heading</div>
          <div className="text-xs font-mono-num font-bold text-white">{boat.cog}°</div>
        </div>
      </div>
    </div>
  );
};
