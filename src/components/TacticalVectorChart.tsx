import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BoatState, AlertState, PotentialFishingZone } from '../types/marine';
import { IMBL_COORDINATES, NAV_LANDMARKS } from '../data/imblData';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Crosshair, 
  Anchor, 
  ShieldAlert, 
  Compass,
  Layers
} from 'lucide-react';

interface TacticalVectorChartProps {
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

export const TacticalVectorChart: React.FC<TacticalVectorChartProps> = ({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Geographic bounds for Palk Bay / Gulf of Mannar region (enclosing 1974 Agreement Positions 1 to 6)
  // Lat: 8.9 to 10.25 N, Lng: 78.85 to 80.15 E
  const bounds = {
    minLat: 8.9,
    maxLat: 10.25,
    minLng: 78.85,
    maxLng: 80.15,
  };

  // Convert lat/lng to canvas x, y coordinates
  const geoToCanvas = useCallback(
    (lat: number, lng: number, width: number, height: number) => {
      // Normalization: (0 to 1)
      const normX = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
      // Invert Y because canvas Y increases downwards
      const normY = (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat);

      const cx = width / 2;
      const cy = height / 2;

      // Apply zoom & pan around center
      const x = cx + (normX * width - cx) * zoom + pan.x;
      const y = cy + (normY * height - cy) * zoom + pan.y;

      return { x, y };
    },
    [zoom, pan]
  );

  // Convert canvas pixel to geo lat/lng (for clicking/dragging boat)
  const canvasToGeo = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2;

      const unzoomedX = (x - pan.x - cx) / zoom + cx;
      const unzoomedY = (y - pan.y - cy) / zoom + cy;

      const normX = unzoomedX / width;
      const normY = unzoomedY / height;

      const lng = bounds.minLng + normX * (bounds.maxLng - bounds.minLng);
      const lat = bounds.maxLat - normY * (bounds.maxLat - bounds.minLat);

      return { lat, lng };
    },
    [zoom, pan]
  );

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Vibrant Blue Ocean Background
    const oceanGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width);
    oceanGrad.addColorStop(0, '#0284c7'); // Vivid Cyan-Blue Ocean
    oceanGrad.addColorStop(0.6, '#0369a1'); // Deep Sea Blue
    oceanGrad.addColorStop(1, '#075985'); // Navy Blue
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Tactical Nautical Coordinate Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const gridStep = 40 * zoom;
    const startX = (pan.x % gridStep + gridStep) % gridStep;
    const startY = (pan.y % gridStep + gridStep) % gridStep;

    for (let x = startX; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = startY; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Bathymetry Depth Contours (Underwater depth rings & soundings)
    const bathymetryPolys = [
      // Shallow water shoal around Adams Bridge
      [
        { lat: 9.25, lng: 79.35 },
        { lat: 9.18, lng: 79.45 },
        { lat: 9.12, lng: 79.52 },
        { lat: 9.08, lng: 79.60 },
        { lat: 9.14, lng: 79.62 },
        { lat: 9.22, lng: 79.48 },
      ],
      // 10m deep water trench in Palk Bay
      [
        { lat: 9.55, lng: 79.15 },
        { lat: 9.75, lng: 79.30 },
        { lat: 9.65, lng: 79.50 },
        { lat: 9.40, lng: 79.35 },
      ],
    ];

    bathymetryPolys.forEach((poly, idx) => {
      ctx.beginPath();
      poly.forEach((pt, i) => {
        const c = geoToCanvas(pt.lat, pt.lng, width, height);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.fillStyle = idx === 0 ? 'rgba(14, 116, 144, 0.14)' : 'rgba(2, 132, 199, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 4. Coastlines (India - Tamil Nadu Coast & Sri Lanka North Coast)
    // India Coastline (Rameswaram Island, Dhanushkodi, Mandapam)
    const indiaCoast = [
      { lat: 10.15, lng: 79.10 },
      { lat: 9.95, lng: 79.22 }, // Kottaipattinam
      { lat: 9.60, lng: 79.12 },
      { lat: 9.32, lng: 79.10 },
      { lat: 9.28, lng: 79.12 }, // Mandapam
      { lat: 9.28, lng: 79.31 }, // Rameswaram
      { lat: 9.15, lng: 79.42 }, // Dhanushkodi
      { lat: 9.14, lng: 79.38 },
      { lat: 9.26, lng: 79.18 },
      { lat: 9.24, lng: 78.95 },
      { lat: 8.85, lng: 78.85 }, // Gulf of Mannar coast
      { lat: 8.80, lng: 78.80 },
      { lat: 10.20, lng: 78.80 },
    ];

    ctx.beginPath();
    indiaCoast.forEach((pt, i) => {
      const c = geoToCanvas(pt.lat, pt.lng, width, height);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#0f2942';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // India Coastline Label
    const indPt = geoToCanvas(9.30, 79.15, width, height);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('INDIA (TAMIL NADU)', indPt.x - 40, indPt.y);

    // Sri Lanka Coastline (Jaffna, Mannar, Talaimannar, Delft Island)
    const sriLankaCoast = [
      { lat: 10.05, lng: 79.85 },
      { lat: 9.80, lng: 79.95 }, // Point Pedro / Jaffna
      { lat: 9.55, lng: 79.75 },
      { lat: 9.12, lng: 79.72 }, // Talaimannar
      { lat: 8.98, lng: 79.90 }, // Mannar Island
      { lat: 8.85, lng: 79.95 },
      { lat: 8.80, lng: 80.00 },
      { lat: 10.15, lng: 80.00 },
    ];

    ctx.beginPath();
    sriLankaCoast.forEach((pt, i) => {
      const c = geoToCanvas(pt.lat, pt.lng, width, height);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#291b24';
    ctx.fill();
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sri Lanka Label
    const lkPt = geoToCanvas(9.20, 79.80, width, height);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('SRI LANKA', lkPt.x, lkPt.y);

    // Katchatheevu Island
    const katchaPt = geoToCanvas(9.3872, 79.5244, width, height);
    ctx.beginPath();
    ctx.arc(katchaPt.x, katchaPt.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#7f1d1d';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.font = '10px sans-serif';
    ctx.fillText('Katchatheevu (கச்சத்தீவு)', katchaPt.x + 10, katchaPt.y + 3);

    // 5. Buffer Zones (2km, 1km, 500m parallel bands)
    if (showBuffers) {
      const buffers = [
        { offset: 0.018, color: '#facc15', label: '2km Yellow Zone' },
        { offset: 0.009, color: '#fb923c', label: '1km Orange Zone' },
        { offset: 0.0045, color: '#ef4444', label: '500m Red Zone' },
      ];

      buffers.forEach(b => {
        ctx.beginPath();
        IMBL_COORDINATES.forEach((pt, i) => {
          const c = geoToCanvas(pt.lat, pt.lng - b.offset, width, height);
          if (i === 0) ctx.moveTo(c.x, c.y);
          else ctx.lineTo(c.x, c.y);
        });
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // 6. International Maritime Boundary Line (IMBL) - Glowing Red Line
    ctx.beginPath();
    IMBL_COORDINATES.forEach((pt, i) => {
      const c = geoToCanvas(pt.lat, pt.lng, width, height);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    // Glow effect
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    // IMBL Boundary Markers (1974 Historic Agreement Positions 1 to 6)
    IMBL_COORDINATES.forEach((pt, i) => {
      const c = geoToCanvas(pt.lat, pt.lng, width, height);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`Pos ${i + 1}`, c.x + 7, c.y + 3);
    });

    // 7. Potential Fishing Zones (PFZ)
    if (showPfz) {
      pfzZones.forEach(zone => {
        const c = geoToCanvas(zone.lat, zone.lng, width, height);
        // Chlorophyll bloom circle
        ctx.beginPath();
        ctx.arc(c.x, c.y, 24 * zoom, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`🐟 ${zone.name.split(' ')[0]} (${zone.catchProbabilityPercent}%)`, c.x - 20, c.y - 12);
      });
    }

    // 8. Other Fleet Boats (AIS Targets)
    if (showFleet) {
      fleetBoats.forEach(fb => {
        const c = geoToCanvas(fb.lat, fb.lng, width, height);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`${fb.name.split(' ')[0]} (${fb.sog}kts)`, c.x + 9, c.y + 4);
      });
    }

    // 9. Past Wake History Trail
    if (wakeHistory.length > 1) {
      ctx.beginPath();
      wakeHistory.forEach((pt, i) => {
        const c = geoToCanvas(pt[0], pt[1], width, height);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 10. Distance Line from Boat to Closest Border Point
    const boatCanvas = geoToCanvas(boat.lat, boat.lng, width, height);
    const borderCanvas = geoToCanvas(alert.closestPoint.lat, alert.closestPoint.lng, width, height);

    ctx.beginPath();
    ctx.moveTo(boatCanvas.x, boatCanvas.y);
    ctx.lineTo(borderCanvas.x, borderCanvas.y);
    ctx.strokeStyle = alert.level === 'BREACH' ? '#e11d48' : alert.level === 'RED' ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance Label
    const midX = (boatCanvas.x + borderCanvas.x) / 2;
    const midY = (boatCanvas.y + borderCanvas.y) / 2;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(midX - 25, midY - 10, 50, 18);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(midX - 25, midY - 10, 50, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${alert.distanceMeters}m`, midX, midY + 3);
    ctx.textAlign = 'left';

    // 11. Safe Return Vector Arrow
    if (alert.level !== 'SAFE') {
      const arrowRad = (alert.safeReturnBearing * Math.PI) / 180;
      const arrowLen = 55 * zoom;
      const targetX = boatCanvas.x + arrowLen * Math.sin(arrowRad);
      const targetY = boatCanvas.y - arrowLen * Math.cos(arrowRad);

      ctx.beginPath();
      ctx.moveTo(boatCanvas.x, boatCanvas.y);
      ctx.lineTo(targetX, targetY);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Arrow head
      const headLen = 10;
      ctx.beginPath();
      ctx.moveTo(targetX, targetY);
      ctx.lineTo(
        targetX - headLen * Math.sin(arrowRad - Math.PI / 6),
        targetY + headLen * Math.cos(arrowRad - Math.PI / 6)
      );
      ctx.lineTo(
        targetX - headLen * Math.sin(arrowRad + Math.PI / 6),
        targetY + headLen * Math.cos(arrowRad + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#10b981';
      ctx.fill();
    }

    // 12. Active Boat Vessel Marker & Directional Radar Beam
    const alertColors = {
      SAFE: '#10b981',
      YELLOW: '#facc15',
      ORANGE: '#fb923c',
      RED: '#ef4444',
      BREACH: '#e11d48',
    };
    const color = alertColors[alert.level];

    // Pulsing Beacon Ring
    ctx.beginPath();
    ctx.arc(boatCanvas.x, boatCanvas.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = `${color}22`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Directional Bow Pointer (oriented to COG)
    const radHeading = (boat.cog * Math.PI) / 180;
    const bowX = boatCanvas.x + 22 * Math.sin(radHeading);
    const bowY = boatCanvas.y - 22 * Math.cos(radHeading);

    ctx.beginPath();
    ctx.arc(boatCanvas.x, boatCanvas.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(boatCanvas.x, boatCanvas.y);
    ctx.lineTo(bowX, bowY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Boat Name tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${boat.name.split(' ')[0]} (SOG: ${boat.sog} kts)`, boatCanvas.x + 14, boatCanvas.y + 4);

    // 13. Other Nearby Fleet Vessels (AIS / LoRa Mesh Traffic)
    if (showFleet && fleetBoats && fleetBoats.length > 0) {
      fleetBoats.forEach((fb) => {
        const fbCanvas = geoToCanvas(fb.lat, fb.lng, width, height);

        // Calculate approximate distance in kilometers
        const distKm = (Math.hypot(fb.lat - boat.lat, (fb.lng - boat.lng) * Math.cos(boat.lat * Math.PI / 180)) * 111).toFixed(1);

        // Connect proximity leader line if close by (< 180 canvas pixels)
        const pixelDist = Math.hypot(fbCanvas.x - boatCanvas.x, fbCanvas.y - boatCanvas.y);
        if (pixelDist < 180) {
          ctx.beginPath();
          ctx.moveTo(boatCanvas.x, boatCanvas.y);
          ctx.lineTo(fbCanvas.x, fbCanvas.y);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Fleet vessel heading vector
        const fbRad = (fb.cog * Math.PI) / 180;
        const fbBowX = fbCanvas.x + 15 * Math.sin(fbRad);
        const fbBowY = fbCanvas.y - 15 * Math.cos(fbRad);

        // Fleet vessel marker
        ctx.beginPath();
        ctx.arc(fbCanvas.x, fbCanvas.y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Heading tick line
        ctx.beginPath();
        ctx.moveTo(fbCanvas.x, fbCanvas.y);
        ctx.lineTo(fbBowX, fbBowY);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fleet boat label & distance tag
        ctx.fillStyle = '#bae6fd';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.fillText(`⛵ ${fb.name.split(' ')[0]} (${distKm}km)`, fbCanvas.x + 9, fbCanvas.y + 3);
      });
    }

    // 14. Nautical Compass Rose in Top Right Corner
    const crX = width - 45;
    const crY = 45;
    ctx.beginPath();
    ctx.arc(crX, crY, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('N', crX - 4, crY - 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('S', crX - 3, crY + 18);
  }, [
    boat,
    fleetBoats,
    alert,
    pfzZones,
    wakeHistory,
    showBuffers,
    showPfz,
    showFleet,
    zoom,
    pan,
    geoToCanvas,
  ]);

  // Mouse / Touch handlers for panning and repositioning boat
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Click on canvas to move boat directly
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const geo = canvasToGeo(x, y, rect.width, rect.height);
    // Boundary check so boat remains in ocean waters
    if (geo.lat >= 8.5 && geo.lat <= 10.3 && geo.lng >= 78.8 && geo.lng <= 80.0) {
      onBoatPositionChange(geo.lat, geo.lng);
    }
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[600px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* High-Resolution HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="w-full h-full cursor-crosshair active:cursor-grabbing"
      />

      {/* Floating Tactical Overlay & Map Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        {/* Vessel Position Pill */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-bold text-white tracking-wide">ECDIS VECTOR NAUTICAL CHART</span>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="text-[11px] font-mono-num text-cyan-300">
            {boat.lat.toFixed(4)}°N, {boat.lng.toFixed(4)}°E
          </div>
        </div>

        {/* Tip for Interactive Testing */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[11px] text-slate-400 px-2.5 py-1 rounded-lg">
          <Anchor className="w-3 h-3 text-cyan-400" />
          <span>Click anywhere to reposition boat • Drag to pan</span>
        </div>
      </div>

      {/* Advisory Floating Badge when Border is Breached */}
      {alert.level === 'BREACH' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-rose-950/95 border-2 border-red-500 shadow-2xl shadow-red-950 rounded-2xl p-2.5 flex items-center gap-2.5 backdrop-blur-md animate-pulse max-w-sm sm:max-w-md text-center">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0"></span>
          <div className="text-xs text-white font-bold leading-tight">
            <span>🚨 BORDER BREACH ALERT: </span>
            <span className="text-amber-200">Manually steer course {alert.safeReturnBearing}° {alert.safeReturnDirectionEn} back into Indian waters</span>
          </div>
        </div>
      )}

      {/* Zoom & Recenter Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl">
        <button
          onClick={() => setZoom(z => Math.min(3.5, z + 0.25))}
          title="Zoom In"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4 text-cyan-400" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.6, z - 0.25))}
          title="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4 text-cyan-400" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          title="Reset Center"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Map Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-xl text-[11px] text-slate-300 flex flex-col gap-1 max-w-xs">
        <div className="flex items-center justify-between font-bold text-white text-xs border-b border-slate-800 pb-1">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            Nautical Vector Legend
          </span>
          <span className="text-[10px] text-slate-400">Palk Strait / Bay</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-red-500"></span>
            <span>1974 IMBL (Pos 1-6)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-yellow-400"></span>
            <span>2km Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-orange-400"></span>
            <span>1km Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-red-400"></span>
            <span>500m Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Fish Zone (PFZ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-emerald-400"></span>
            <span>Safe Return Heading</span>
          </div>
        </div>
      </div>
    </div>
  );
};
