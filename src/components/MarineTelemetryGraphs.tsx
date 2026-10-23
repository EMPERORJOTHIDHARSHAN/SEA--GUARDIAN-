import React, { useState, useEffect } from 'react';
import { BoatState, AlertState } from '../types/marine';
import { 
  LineChart, 
  Activity, 
  Waves, 
  Fish, 
  Radio, 
  Cpu, 
  TrendingDown, 
  TrendingUp, 
  ShieldAlert,
  Gauge,
  Wifi
} from 'lucide-react';

interface MarineTelemetryGraphsProps {
  boat: BoatState;
  alert: AlertState;
}

export const MarineTelemetryGraphs: React.FC<MarineTelemetryGraphsProps> = ({
  boat,
  alert,
}) => {
  // Distance history buffer (last 25 data points)
  const [distanceHistory, setDistanceHistory] = useState<number[]>([
    4500, 4200, 3800, 3400, 3100, 2800, 2400, 2100, 1950, 1800,
  ]);

  // Speed history
  const [speedHistory, setSpeedHistory] = useState<number[]>([
    6.2, 6.4, 6.5, 6.8, 6.6, 6.5, 6.7, 6.8, 6.9, 6.8,
  ]);

  // Record history periodically
  useEffect(() => {
    const interval = window.setInterval(() => {
      setDistanceHistory(prev => [...prev.slice(-24), alert.distanceMeters]);
      setSpeedHistory(prev => [...prev.slice(-24), boat.sog]);
    }, 1500);

    return () => clearInterval(interval);
  }, [alert.distanceMeters, boat.sog]);

  // Calculate SVG line points for distance chart
  const svgWidth = 500;
  const svgHeight = 160;
  const maxDist = 5000; // 5 km max scale

  const getSvgY = (dist: number) => {
    // 0m is at the bottom (or 0 baseline)
    const norm = Math.max(0, Math.min(1, dist / maxDist));
    return svgHeight - norm * (svgHeight - 20) - 10;
  };

  const polylinePoints = distanceHistory
    .map((dist, idx) => {
      const x = (idx / (distanceHistory.length - 1 || 1)) * svgWidth;
      const y = getSvgY(dist);
      return `${x},${y}`;
    })
    .join(' ');

  // SVG Area path for colored gradient
  const areaPath = `0,${svgHeight} ${polylinePoints} ${svgWidth},${svgHeight}`;

  // Depth sounder sonar metrics
  const waterDepthMeters = 14.8;
  const boatDraftMeters = 1.6;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              REAL-TIME MARINE TELEMETRY & SONAR GRAPHS
            </h3>
            <p className="text-xs text-slate-400">
              Live IMBL boundary distance trends, under-keel echo sounder bathymetry, and engine metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-num px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
            1 Hz LIVE STREAM
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GRAPH 1: Distance to IMBL Trend Line with Threshold Bands */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Boundary Distance Profile (Meters to IMBL)</span>
              </div>
              <span className={`text-xs font-mono-num font-bold ${
                alert.level === 'BREACH' ? 'text-rose-400' :
                alert.level === 'RED' ? 'text-red-400' :
                alert.level === 'ORANGE' ? 'text-amber-400' :
                alert.level === 'YELLOW' ? 'text-yellow-300' : 'text-emerald-400'
              }`}>
                Current: {alert.distanceMeters}m ({alert.level})
              </span>
            </div>

            {/* SVG Trend Graph */}
            <div className="relative w-full h-[180px] bg-slate-950/80 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Threshold Reference Lines */}
                {/* 2000m Yellow Buffer */}
                <line
                  x1="0"
                  y1={getSvgY(2000)}
                  x2={svgWidth}
                  y2={getSvgY(2000)}
                  stroke="#facc15"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.6"
                />
                <text x="6" y={getSvgY(2000) - 3} fill="#facc15" fontSize="9" fontFamily="monospace">
                  2,000m Yellow Alert
                </text>

                {/* 1000m Orange Buffer */}
                <line
                  x1="0"
                  y1={getSvgY(1000)}
                  x2={svgWidth}
                  y2={getSvgY(1000)}
                  stroke="#fb923c"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.7"
                />
                <text x="6" y={getSvgY(1000) - 3} fill="#fb923c" fontSize="9" fontFamily="monospace">
                  1,000m Orange Alert
                </text>

                {/* 500m Red Buffer */}
                <line
                  x1="0"
                  y1={getSvgY(500)}
                  x2={svgWidth}
                  y2={getSvgY(500)}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.8"
                />
                <text x="6" y={getSvgY(500) - 3} fill="#ef4444" fontSize="9" fontFamily="monospace">
                  500m Red Danger
                </text>

                {/* 0m Boundary Baseline */}
                <line
                  x1="0"
                  y1={getSvgY(0)}
                  x2={svgWidth}
                  y2={getSvgY(0)}
                  stroke="#e11d48"
                  strokeWidth="1.5"
                  opacity="0.9"
                />
                <text x="6" y={getSvgY(0) - 3} fill="#e11d48" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  IMBL BORDER LINE (0m)
                </text>

                {/* Shaded Area */}
                <polygon points={areaPath} fill="url(#distGradient)" />

                {/* Telemetry Line */}
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Current Point Marker */}
                {distanceHistory.length > 0 && (
                  <circle
                    cx={svgWidth}
                    cy={getSvgY(alert.distanceMeters)}
                    r="4"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono-num">
            <span>&larr; 30 seconds ago</span>
            <span className="text-cyan-400">Time Series Monitoring</span>
            <span>Real-time (Now) &rarr;</span>
          </div>
        </div>

        {/* GRAPH 2: Under-Keel Echo Sounder & Bathymetry Sonar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>Under-Keel Echo Sounder (Sonar 200 kHz)</span>
              </div>
              <span className="text-xs font-mono-num font-bold text-cyan-300">
                Depth: {waterDepthMeters}m (Safe Under Keel)
              </span>
            </div>

            {/* Visual Sonar Column */}
            <div className="relative w-full h-[180px] bg-gradient-to-b from-[#031526] via-[#021020] to-[#010912] rounded-xl border border-slate-800/80 p-3 overflow-hidden flex flex-col justify-between">
              {/* Sea Surface & Boat Hull */}
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1 text-[11px] text-cyan-300 font-mono-num">
                <span className="flex items-center gap-1.5">
                  <span className="text-lg">🚢</span>
                  <span>Boat Draft: {boatDraftMeters}m</span>
                </span>
                <span className="text-slate-400 text-[10px]">Sea Surface (0.0m)</span>
              </div>

              {/* Sonar Beam Cones & Ultrasonic Waves */}
              <div className="relative flex-1 flex items-center justify-center my-1">
                {/* Triangular Ultrasonic Sounder Beam */}
                <div
                  className="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[90px] border-b-cyan-500/10 pointer-events-none"
                  style={{ transform: 'rotate(180deg)' }}
                />

                {/* School of fish echo reflections */}
                <div className="absolute top-8 left-1/3 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] text-emerald-300 font-bold animate-pulse">
                  <Fish className="w-3 h-3" />
                  <span>Fish Echo (Depth 7.2m)</span>
                </div>
              </div>

              {/* Seabed Bathymetric Contour Floor */}
              <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/50 border-t-2 border-amber-600/70 pt-1 flex items-center justify-between text-[11px] text-amber-300 font-mono-num">
                <span>Sandy Shoal Seabed</span>
                <span className="font-bold text-amber-200">Total Sounding: {waterDepthMeters}m</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Transducer: Airmar B60 Bronze Through-Hull</span>
            <span className="text-emerald-400 font-semibold font-mono-num">No Shoal Hazard</span>
          </div>
        </div>
      </div>

      {/* Speed Over Ground & Satellite SNR Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Speed / Throttle Gauge */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Speed Over Ground (SOG)
            </span>
            <span className="text-xs font-mono-num text-white font-bold">{boat.sog.toFixed(1)} kts</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 my-2 overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-300"
              style={{ width: `${(boat.sog / 14) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono-num">
            <span>0 kts (Idle)</span>
            <span>7 kts (Cruise)</span>
            <span>14 kts (Max)</span>
          </div>
        </div>

        {/* Engine RPM & Load */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Engine Load / RPM
            </span>
            <span className="text-xs font-mono-num text-emerald-400 font-bold">1,820 RPM</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 my-2 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[65%]" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono-num">
            <span>Coolant: 84°C</span>
            <span>Oil: 4.2 Bar</span>
            <span>Burn: 18 L/h</span>
          </div>
        </div>

        {/* LoRa 868MHz RSSI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-purple-400" />
              LoRa Signal Strength
            </span>
            <span className="text-xs font-mono-num text-purple-300 font-bold">{boat.loraSignalRssi} dBm</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 my-2 overflow-hidden">
            <div className="bg-purple-500 h-full w-[78%]" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono-num">
            <span>SNR: +9.2 dB</span>
            <span>Packet Loss: 0.0%</span>
          </div>
        </div>

        {/* GPS Satellite Constellation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-emerald-400" />
              GPS Satellites (NEO-6M)
            </span>
            <span className="text-xs font-mono-num text-emerald-300 font-bold">{boat.satelliteCount} Sats Locked</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 my-2 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[88%]" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono-num">
            <span>HDOP: {boat.hdop}</span>
            <span>NavIC + GPS 3D Fix</span>
          </div>
        </div>
      </div>
    </div>
  );
};
