/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BoatState, OfflineTelemetryPoint } from '../types/marine';
import { IMBL_COORDINATES } from '../data/imblData';
import { 
  getAllPoints, 
  clearAllPoints, 
  generateSampleVoyageHistory 
} from '../utils/offlineTrackerDb';
import { offlineSyncEngine, SyncEngineStatus } from '../utils/offlineSyncEngine';
import { 
  HardDrive, 
  Cloud, 
  Wifi, 
  WifiOff, 
  Satellite, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowUpRight, 
  Download, 
  CheckCircle2, 
  Clock, 
  Info, 
  Ship, 
  Compass, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface OfflineTrackingViewProps {
  boat: BoatState;
  onJumpToPosition?: (lat: number, lng: number) => void;
}

export function OfflineTrackingView({ boat, onJumpToPosition }: OfflineTrackingViewProps) {
  // Sync engine reactive status
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isSimulatedOffline: offlineSyncEngine.getSimulatedOffline(),
    effectiveOnline: offlineSyncEngine.isOnline(),
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    totalCount: 0,
  });

  // Telemetry track points in DB
  const [points, setPoints] = useState<OfflineTelemetryPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<OfflineTelemetryPoint | null>(null);

  // Auto-recording timer interval (in seconds)
  const [logIntervalSec, setLogIntervalSec] = useState<number>(30); // 30s demo interval, real sea is 300s (5m)
  const [isAutoLogging, setIsAutoLogging] = useState<boolean>(true);
  const [nextLogCountdown, setNextLogCountdown] = useState<number>(30);

  // Route playback simulation
  const [isPlayingRoute, setIsPlayingRoute] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const playbackTimerRef = useRef<any>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineSyncedRef = useRef<L.Polyline | null>(null);
  const polylineUnsyncedRef = useRef<L.Polyline | null>(null);
  const playbackMarkerRef = useRef<L.Marker | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Notification message
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'warn' | 'info' = 'info') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Subscribe to Sync Engine
  useEffect(() => {
    const unsubscribe = offlineSyncEngine.subscribe((status) => {
      setSyncStatus(status);
      refreshPoints();
    });
    return () => unsubscribe();
  }, []);

  const refreshPoints = async () => {
    const list = await getAllPoints(boat.regNumber);
    setPoints(list);
    if (list.length > 0 && playbackIndex >= list.length) {
      setPlaybackIndex(list.length - 1);
    }
  };

  // Initial load
  useEffect(() => {
    refreshPoints();
  }, [boat.regNumber]);

  // Periodic automatic GNSS location logger (Store mode)
  useEffect(() => {
    if (!isAutoLogging) return;

    const timer = setInterval(() => {
      setNextLogCountdown((prev) => {
        if (prev <= 1) {
          // Record current position
          offlineSyncEngine.recordCurrentPosition(boat);
          refreshPoints();
          return logIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoLogging, logIntervalSec, boat]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [boat.lat, boat.lng],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // IMBL Line
    const imblCoords = IMBL_COORDINATES.map((p) => [p.lat, p.lng] as [number, number]);
    L.polyline(imblCoords, {
      color: '#ef4444',
      weight: 3,
      dashArray: '6, 6',
      opacity: 0.85,
    }).addTo(map).bindPopup('<b>1974 International Maritime Boundary Line (IMBL)</b>');

    // Polylines for synced vs unsynced points
    polylineSyncedRef.current = L.polyline([], {
      color: '#10b981', // Green for cloud-synced
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    polylineUnsyncedRef.current = L.polyline([], {
      color: '#f59e0b', // Amber for offline store pending
      weight: 4,
      dashArray: '5, 5',
      opacity: 0.9,
    }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);

    // Playback Marker
    const boatIcon = L.divIcon({
      className: 'playback-boat-icon',
      html: `
        <div style="
          width: 30px; 
          height: 30px; 
          background: #0284c7; 
          border: 2px solid #ffffff; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-weight: bold;
          box-shadow: 0 0 12px rgba(2, 132, 199, 0.8);
        ">
          ⛵
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    playbackMarkerRef.current = L.marker([boat.lat, boat.lng], { icon: boatIcon }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map layers when points change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const syncedLatLngs: [number, number][] = [];
    const unsyncedLatLngs: [number, number][] = [];

    markersGroupRef.current?.clearLayers();

    points.forEach((pt, idx) => {
      const latlng: [number, number] = [pt.lat, pt.lng];
      if (pt.synced) {
        syncedLatLngs.push(latlng);
      } else {
        unsyncedLatLngs.push(latlng);
      }

      // Add circle waypoint marker
      const isLatest = idx === points.length - 1;
      const markerColor = pt.synced ? '#10b981' : '#f59e0b';

      const circle = L.circleMarker(latlng, {
        radius: isLatest ? 7 : 4,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.9,
      });

      circle.bindTooltip(`
        <div style="font-family: sans-serif; font-size: 11px;">
          <strong>Point #${idx + 1}</strong> (${new Date(pt.recordedAt).toLocaleTimeString()})<br/>
          Status: <span style="color: ${markerColor}; font-weight: bold;">${pt.synced ? '☁️ Cloud DB Synced' : '💾 Local DB (Offline Store)'}</span><br/>
          Speed: ${pt.sog} kts | Heading: ${pt.cog}°<br/>
          Lat/Lng: ${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}
        </div>
      `);

      circle.on('click', () => {
        setSelectedPoint(pt);
        setPlaybackIndex(idx);
      });

      markersGroupRef.current?.addLayer(circle);
    });

    polylineSyncedRef.current?.setLatLngs(syncedLatLngs);
    polylineUnsyncedRef.current?.setLatLngs(unsyncedLatLngs);

    if (points.length > 0 && !isPlayingRoute) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [points]);

  // Route Playback Animation
  useEffect(() => {
    if (!isPlayingRoute || points.length === 0) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    playbackTimerRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1;
        if (next >= points.length) {
          setIsPlayingRoute(false);
          return points.length - 1;
        }
        return next;
      });
    }, 1200);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlayingRoute, points]);

  // Update playback marker position
  useEffect(() => {
    if (!playbackMarkerRef.current || points.length === 0) return;
    const currentPt = points[playbackIndex];
    if (currentPt) {
      playbackMarkerRef.current.setLatLng([currentPt.lat, currentPt.lng]);
      setSelectedPoint(currentPt);
    }
  }, [playbackIndex, points]);

  // Handle manual recording
  const handleRecordNow = async () => {
    await offlineSyncEngine.recordCurrentPosition(boat);
    await refreshPoints();
    setNextLogCountdown(logIntervalSec);
    showFeedback('📍 தற்போதைய GNSS அட்சரேகை/தீர்க்கரேகை லோக்கல் டேட்டாபேஸில் பதியப்பட்டது (Stored Locally)', 'success');
  };

  // Handle forced sync forward
  const handleForceSync = async () => {
    showFeedback('🔄 கிளவுட் டேட்டாபேஸுக்கு அனுப்பப்படுகிறது (Forwarding to Cloud DB)...', 'info');
    const result = await offlineSyncEngine.triggerBackgroundSync();
    await refreshPoints();
    if (result.success) {
      showFeedback(result.message, 'success');
    } else {
      showFeedback(result.message, 'warn');
    }
  };

  // Load sample 8-hour deep sea voyage
  const handleLoadSampleVoyage = async () => {
    showFeedback('🛳️ 8 மணி நேர மாதிரி கடல் பயணப் பாதை உருவாக்கப்படுகிறது...', 'info');
    await generateSampleVoyageHistory(boat);
    await refreshPoints();
    setPlaybackIndex(0);
    showFeedback('✅ மாதிரி கடல் பயணம் ஏற்றப்பட்டது! வரைபடத்தில் பயணப் பாதையை (Playback) பார்க்கலாம்.', 'success');
  };

  // Clear log
  const handleClear = async () => {
    if (window.confirm('உள்ளூர் ஆஃப்லைன் பயணப் பதிவுகளை அழிக்க வேண்டுமா? (Clear local offline logs?)')) {
      await clearAllPoints(boat.regNumber);
      await refreshPoints();
      setSelectedPoint(null);
      setPlaybackIndex(0);
      showFeedback('🗑️ பதிவுகள் அழிக்கப்பட்டன (Logs cleared)', 'info');
    }
  };

  // Export GPX / CSV
  const handleExportCsv = () => {
    if (points.length === 0) {
      showFeedback('ஏற்றுமதி செய்ய பதிவுகள் இல்லை (No points to export)', 'warn');
      return;
    }
    const headers = 'Point,RecordedAt,Latitude,Longitude,SpeedKnots,HeadingDeg,BatteryPercent,Status,SyncedAt\n';
    const rows = points
      .map(
        (p, i) =>
          `${i + 1},${p.recordedAt},${p.lat},${p.lng},${p.sog},${p.cog},${p.batteryPercent}%,${p.synced ? 'FORWARDED_TO_CLOUD' : 'STORED_LOCALLY_OFFLINE'},${p.syncedAt || 'PENDING'}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Voyage_Track_${boat.regNumber}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('📥 கடல் பயண CSV அறிக்கை பதிவிறக்கப்பட்டது!', 'success');
  };

  return (
    <div className="flex flex-col gap-4 pb-20 animate-in fade-in">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-between shadow-xl transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : feedbackMsg.type === 'warn'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
              : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs opacity-75 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Main Concept Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                OFFLINE TRACKING ARCHITECTURE
              </span>
              <span className="text-xs text-slate-400 font-tamil">ஸ்டோர் அண்ட் ஃபார்வர்டு நுட்பம்</span>
            </div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-cyan-400" />
              Offline GNSS Tracking (Store & Forward)
            </h2>
            <p className="text-xs text-slate-300 font-tamil mt-1 leading-relaxed max-w-2xl">
              கடலில் மொபைல் இன்டர்நெட் கிடைக்காதபோதும், போனில் உள்ள GNSS தொடர்ந்து லொகேஷனை எடுத்து 
              <strong className="text-cyan-400"> லோக்கல் டேட்டாபேஸில் (IndexedDB/SQLite)</strong> சேமிக்கும். 
              மீன்பிடித்துவிட்டு கரைக்குத் திரும்பியவுடன் ஆப் தானாகவே 
              <strong className="text-emerald-400"> கிளவுட் டேட்டாபேஸுக்கு (Cloud DB)</strong> புஷ் செய்திடும்!
            </p>
          </div>

          {/* Interactive Sea vs Shore Simulation Switch */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              கடல் நிலை மாதிரி சோதனை (Simulation):
            </span>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => {
                  offlineSyncEngine.setSimulatedOffline(true);
                  showFeedback('📴 ஆஃப்லைன் பயன்முறை இயக்கப்பட்டது (கடலில் இன்டர்நெட் இல்லை - Store Mode)', 'warn');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  syncStatus.isSimulatedOffline
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>ஆழ்கடல் (Offline)</span>
              </button>

              <button
                onClick={() => {
                  offlineSyncEngine.setSimulatedOffline(false);
                  showFeedback('📶 கரைக்கு திரும்பியது! ஆட்டோமேட்டிக் கிளவுட் பார்வர்டு (Forward to Cloud) தூண்டப்பட்டது.', 'success');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  !syncStatus.isSimulatedOffline
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>கரை திரும்பல் (Online)</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-tamil text-center">
              {syncStatus.isSimulatedOffline 
                ? '📴 ஆழ்கடலில் உள்ளீர்கள்: புள்ளிகள் லோக்கலில் மட்டும் சேமிக்கப்படும்' 
                : '📶 கரைக்கு திரும்பியுள்ளீர்கள்: நெட்வொர்க் கிடைத்து தானாக பதிவேறும்'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Status Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: GNSS Satellite Fix */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">GNSS சிக்னல்</span>
            <Satellite className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="my-1">
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>ACTIVE FIX (11 Sats)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {boat.lat.toFixed(4)}°N, {boat.lng.toFixed(4)}°E
            </div>
          </div>
          <div className="text-[10px] text-cyan-400 font-tamil">
            இன்டர்நெட் இன்றி தொடர்ந்து இயங்கும்
          </div>
        </div>

        {/* Metric 2: Local DB (Store Queue) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">லோக்கல் DB (Store)</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1">
            <div className="text-xl font-black text-amber-400">
              {syncStatus.pendingCount} <span className="text-xs font-normal text-slate-400">காத்திருப்பில்</span>
            </div>
            <div className="text-[11px] text-slate-300">
              மொத்தப் பதிவுகள்: {syncStatus.totalCount}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-tamil">
            IndexedDB / SQLite ஸ்டோரேஜ்
          </div>
        </div>

        {/* Metric 3: Cloud DB (Forwarded Status) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">கிளவுட் DB (Forwarded)</span>
            <Cloud className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-1">
            <div className="text-xl font-black text-emerald-400">
              {syncStatus.syncedCount} <span className="text-xs font-normal text-slate-400">பதிவேற்றப்பட்டது</span>
            </div>
            <div className="text-[11px] text-slate-300">
              {syncStatus.isSyncing ? '🔄 பதிவேற்றப்படுகிறது...' : 'பாதுகாப்பாக சேமிக்கப்பட்டது'}
            </div>
          </div>
          <div className="text-[10px] text-emerald-400/90 font-tamil">
            MySQL / Cloud Server
          </div>
        </div>

        {/* Metric 4: Auto-Logging Interval */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">தானியங்கி பதிவு</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="text-sm font-bold text-white flex items-center gap-1">
              <span>{isAutoLogging ? `அடுத்த பதிவு: ${nextLogCountdown} வினாடி` : 'நிறுத்தப்பட்டுள்ளது'}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setLogIntervalSec(10)}
                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${logIntervalSec === 10 ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
              >
                10s
              </button>
              <button
                onClick={() => setLogIntervalSec(30)}
                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${logIntervalSec === 30 ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
              >
                30s
              </button>
              <button
                onClick={() => setLogIntervalSec(300)}
                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${logIntervalSec === 300 ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
              >
                5 min (Real)
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsAutoLogging(!isAutoLogging)}
            className="text-[10px] text-cyan-400 font-semibold hover:underline text-left cursor-pointer"
          >
            {isAutoLogging ? '⏸️ இடைநிறுத்து' : '▶️ மீண்டும் இயக்கு'}
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 border border-slate-800 p-2.5 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Record GNSS point now */}
          <button
            onClick={handleRecordNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow transition cursor-pointer"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>இப்போது புள்ளி பதிவு செய் (Record Waypoint)</span>
          </button>

          {/* Sync now */}
          <button
            onClick={handleForceSync}
            disabled={syncStatus.isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow transition cursor-pointer ${
              syncStatus.pendingCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>
              {syncStatus.isSyncing ? 'பதிவேற்றப்படுகிறது...' : `கிளவுடுக்கு பதிவேற்று (${syncStatus.pendingCount})`}
            </span>
          </button>

          {/* Load Sample Sea Voyage */}
          <button
            onClick={handleLoadSampleVoyage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 text-xs font-medium transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>8 மணி நேர மாதிரி கடல் பயணம் ஏற்று</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV அறிக்கை</span>
          </button>

          {/* Clear Logs */}
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs cursor-pointer"
            title="Clear stored route"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>அழி</span>
          </button>
        </div>
      </div>

      {/* Main Map: Past Tracking & Route Playback */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Map Header & Playback Scrubber */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                பயணப் பாதை வரலாறு & பிளேபேக் (Past Voyage Route Playback)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {points.length} waypoints
              </span>
            </div>

            {/* Map Legend */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>கிளவுடில் பதியப்பட்டது (Synced)</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>ஆஃப்லைனில் உள்ளவை (Offline Stored)</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400 font-medium">
                <span className="w-3 h-0.5 bg-rose-500 inline-block" />
                <span>1974 IMBL எல்லை</span>
              </div>
            </div>
          </div>

          {/* Timeline Playback Controls */}
          {points.length > 0 && (
            <div className="flex items-center gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsPlayingRoute(!isPlayingRoute)}
                className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition ${
                  isPlayingRoute ? 'bg-amber-500 text-slate-950' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                }`}
              >
                {isPlayingRoute ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>புள்ளி #{playbackIndex + 1} / {points.length}</span>
                  <span>
                    {points[playbackIndex] ? new Date(points[playbackIndex].recordedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={points.length - 1}
                  value={playbackIndex}
                  onChange={(e) => {
                    setIsPlayingRoute(false);
                    setPlaybackIndex(Number(e.target.value));
                  }}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {selectedPoint && (
                <div className="text-right text-[11px] font-mono text-cyan-300 shrink-0 hidden sm:block">
                  <div>{selectedPoint.sog} kts | {selectedPoint.cog}°</div>
                  <div className="text-[10px] text-slate-400">
                    எல்லை தூரம்: {selectedPoint.distanceToBorderNm} NM
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-[380px] bg-slate-950" />
      </div>

      {/* Waypoints Data Table (Store & Forward Inspector) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">
              பதிவு செய்யப்பட்ட புள்ளிகளின் பட்டியல் (Logged Coordinates History)
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-tamil">
            {points.length} சேமிக்கப்பட்ட இடங்கள்
          </span>
        </div>

        {points.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <HardDrive className="w-8 h-8 text-slate-600" />
            <p className="text-sm font-medium">இன்னும் புள்ளிகள் எதுவும் சேமிக்கப்படவில்லை.</p>
            <p className="text-xs text-slate-500 font-tamil">
              மேலே உள்ள "புள்ளி பதிவு செய்" அல்லது "மாதிரி கடல் பயணம் ஏற்று" பட்டனை அழுத்தவும்.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">நேரம் (Time)</th>
                  <th className="py-2.5 px-3">அட்சரேகை / தீர்க்கரேகை</th>
                  <th className="py-2.5 px-3">வேகம் / திசை</th>
                  <th className="py-2.5 px-3">எல்லை தூரம்</th>
                  <th className="py-2.5 px-3">நிலை (Store & Forward Status)</th>
                  <th className="py-2.5 px-3 text-right">செயல்</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {points.map((pt, i) => {
                  const isSelected = selectedPoint?.uuid === pt.uuid || playbackIndex === i;
                  return (
                    <tr
                      key={pt.uuid || i}
                      onClick={() => {
                        setSelectedPoint(pt);
                        setPlaybackIndex(i);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.panTo([pt.lat, pt.lng]);
                        }
                      }}
                      className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-cyan-950/40 border-l-4 border-cyan-400' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-400 font-bold">{i + 1}</td>
                      <td className="py-2 px-3 text-slate-200">
                        {new Date(pt.recordedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-cyan-300">{pt.lat.toFixed(4)}°N</span>,{' '}
                        <span className="text-cyan-300">{pt.lng.toFixed(4)}°E</span>
                      </td>
                      <td className="py-2 px-3">
                        {pt.sog} kts | {pt.cog}°
                      </td>
                      <td className="py-2 px-3 text-amber-300">
                        {pt.distanceToBorderNm} NM
                      </td>
                      <td className="py-2 px-3">
                        {pt.synced ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>கிளவுடில் பதியப்பட்டது</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 border border-amber-500/40 text-amber-300 animate-pulse">
                            <HardDrive className="w-3 h-3" />
                            <span>ஆஃப்லைன் ஸ்டோர் (Pending)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onJumpToPosition) onJumpToPosition(pt.lat, pt.lng);
                            showFeedback(`படகு புள்ளி #${i + 1}-க்கு மாற்றப்பட்டது.`, 'info');
                          }}
                          className="text-[10px] text-cyan-400 hover:text-white flex items-center gap-0.5 ml-auto cursor-pointer"
                        >
                          <span>காட்டு</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Educational Guide: Store & Forward Architecture in Tamil */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-tamil">
        <h5 className="font-bold text-white text-sm flex items-center gap-2 mb-2 font-sans">
          <Info className="w-4 h-4 text-cyan-400" />
          Store and Forward நுட்பத்தின் செயல்பாட்டு விளக்கம்:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-amber-400 font-bold block mb-1">1. ஆழ்கடலில் சேமிப்பு (Store):</span>
            கடலில் 4G/5G இணையம் துண்டிக்கப்பட்டாலும், போனில் உள்ள GNSS / GPS சிப் தடையின்றி இயங்கும். 5 நிமிடத்திற்கு ஒருமுறை படகின் இருப்பிடம் உள்ளூர் டேட்டாபேஸில் (Local DB) தானாகப் பதியும்.
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-400 font-bold block mb-1">2. கரைக்குத் திரும்புகையில் (Forward):</span>
            மீன்பிடித்துவிட்டு கரைக்குத் திரும்பும்போது மொபைல் டவர் சிக்னல் கிடைத்தவுடன், ஆப் பேக்கிரவுண்டில் தானாகவே அனைத்துப் புள்ளிகளையும் மீன்வளத்துறை மெயின் கிளவுட் டேட்டாபேஸுக்கு மாற்றிவிடும்.
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">3. வரலாறு மேப் பார்வை (Playback):</span>
            மீனவர்களும் கடலோரக் காவல் துறை அதிகாரிகளும், படகு கடலில் எந்தெந்த எல்லைப் பகுதிகள் வழியாகப் பயணித்துத் திரும்பியது என்ற முழுமையான வரலாற்றை (Voyage Path) மேப்பில் பார்க்கலாம்.
          </div>
        </div>
      </div>
    </div>
  );
}
