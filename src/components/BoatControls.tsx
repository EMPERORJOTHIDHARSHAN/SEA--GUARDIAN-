import React from 'react';
import { BoatState, AlertState } from '../types/marine';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Compass, 
  Radio, 
  Anchor, 
  Wind,
  Navigation2,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Info,
  SlidersHorizontal,
  Navigation
} from 'lucide-react';

interface BoatControlsProps {
  boat: BoatState;
  alert: AlertState;
  isSimulating: boolean;
  onToggleSimulating: () => void;
  onSpeedChange: (speed: number) => void;
  onHeadingChange: (heading: number) => void;
  onResetPosition: (presetKey?: string) => void;
  isRealGpsMode: boolean;
  onToggleGpsMode: () => void;
  onClose?: () => void;
}

export const BoatControls: React.FC<BoatControlsProps> = ({
  boat,
  alert,
  isSimulating,
  onToggleSimulating,
  onSpeedChange,
  onHeadingChange,
  onResetPosition,
  isRealGpsMode,
  onToggleGpsMode,
  onClose,
}) => {
  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              GPS Telemetry & Scenario Simulator
            </h3>
            <p className="text-[11px] text-slate-400">
              Simulate GPS positions to test boundary alert escalations
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Advisory Notice Banner: Explaining Pure Alert Architecture */}
      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            Advisory Alert System Architecture (எச்சரிக்கை வழிகாட்டி மட்டுமே)
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The Sea Guardian unit sends acoustic alarms, Tamil voice prompts, and recommended compass headings to the crew. It does <strong className="text-amber-300">not</strong> take mechanical engine or reverse control of the vessel. Fishermen maintain complete helm command.
          </p>
        </div>
      </div>

      {/* GPS Source Selector (Device GPS vs Simulator) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">GPS Position Input Source:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleGpsMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              !isRealGpsMode
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Virtual Simulator
          </button>
          <button
            onClick={onToggleGpsMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isRealGpsMode
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Phone GPS Sensor
          </button>
        </div>
      </div>

      {/* Primary Simulator Controls (Throttle & Rudder Steering) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Speed Throttle */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Anchor className="w-3.5 h-3.5 text-cyan-400" />
              Simulated Speed (SOG)
            </span>
            <span className="font-mono-num font-bold text-cyan-400 text-sm">
              {boat.sog.toFixed(1)} kts
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="14"
            step="0.5"
            value={boat.sog}
            disabled={isRealGpsMode}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex items-center justify-between gap-1 mt-2">
            <button
              onClick={() => onSpeedChange(0)}
              disabled={isRealGpsMode}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
            >
              0 kts (Drift)
            </button>
            <button
              onClick={() => onSpeedChange(5.5)}
              disabled={isRealGpsMode}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
            >
              5.5 kts (Trawl)
            </button>
            <button
              onClick={() => onSpeedChange(9.0)}
              disabled={isRealGpsMode}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
            >
              9 kts (Cruise)
            </button>
            <button
              onClick={() => onSpeedChange(13.0)}
              disabled={isRealGpsMode}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
            >
              13 kts (Full)
            </button>
          </div>
        </div>

        {/* Rudder / Compass Heading */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Simulated Heading (COG)
            </span>
            <span className="font-mono-num font-bold text-cyan-400 text-sm">
              {boat.cog}° ({boat.cog >= 337.5 || boat.cog < 22.5 ? 'N' : boat.cog < 67.5 ? 'NE' : boat.cog < 112.5 ? 'E' : boat.cog < 157.5 ? 'SE' : boat.cog < 202.5 ? 'S' : boat.cog < 247.5 ? 'SW' : boat.cog < 292.5 ? 'W' : 'NW'})
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="359"
            step="5"
            value={boat.cog}
            disabled={isRealGpsMode}
            onChange={(e) => onHeadingChange(parseInt(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex items-center justify-between gap-1 mt-2">
            <button
              onClick={() => onHeadingChange((boat.cog - 15 + 360) % 360)}
              disabled={isRealGpsMode}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Port -15°</span>
            </button>
            <button
              onClick={() => onHeadingChange(alert.safeReturnBearing)}
              disabled={isRealGpsMode}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-semibold flex items-center gap-1"
            >
              <Navigation className="w-3 h-3 text-cyan-400" />
              <span>Safe ({alert.safeReturnBearing}°)</span>
            </button>
            <button
              onClick={() => onHeadingChange((boat.cog + 15) % 360)}
              disabled={isRealGpsMode}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1"
            >
              <Navigation2 className="w-3 h-3 rotate-90 text-cyan-400" />
              <span>Stbd +15°</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Play / Pause Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSimulating}
          disabled={isRealGpsMode}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isSimulating
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
          }`}
        >
          {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isSimulating ? 'Pause GPS Movement' : 'Resume GPS Movement'}</span>
        </button>
      </div>

      {/* Preset Scenarios for Demonstration & Evaluation */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
        <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Field Testing Presets:
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            Jump GPS position & observe alarms
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Preset 1: Safe Zone */}
          <button
            onClick={() => onResetPosition('SAFE')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-600/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safe Waters</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">4.8 km to border</div>
            <div className="text-[9px] text-slate-500 font-tamil mt-0.5">பாதுகாப்பான கடல்</div>
          </button>

          {/* Preset 2: Yellow Alert (2km) */}
          <button
            onClick={() => onResetPosition('YELLOW')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-yellow-950/60 border border-slate-800 hover:border-yellow-500/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Yellow Alert</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">1.8 km to border</div>
            <div className="text-[9px] text-slate-500 font-tamil mt-0.5">மஞ்சள் எச்சரிக்கை</div>
          </button>

          {/* Preset 3: Orange Alert (1km) */}
          <button
            onClick={() => onResetPosition('ORANGE')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Orange Alert</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">850 m to border</div>
            <div className="text-[9px] text-slate-500 font-tamil mt-0.5">ஆரஞ்சு எச்சரிக்கை</div>
          </button>

          {/* Preset 4: Red Alert (500m) */}
          <button
            onClick={() => onResetPosition('RED')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-500/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5" />
              <span>Red Alert</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">380 m to border</div>
            <div className="text-[9px] text-slate-500 font-tamil mt-0.5">அபாய எச்சரிக்கை</div>
          </button>

          {/* Preset 5: Critical Breach */}
          <button
            onClick={() => onResetPosition('BREACH')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>Border Breach</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Crossed into LK</div>
            <div className="text-[9px] text-slate-500 font-tamil mt-0.5">எல்லை மீறல்!</div>
          </button>

          {/* Preset 6: Engine Failure Drift */}
          <button
            onClick={() => onResetPosition('DRIFT')}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold">
              <Wind className="w-3.5 h-3.5" />
              <span>Engine Drift</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Current drift 2.2kt</div>
            <div className="text-[9px] text-slate-500 font-tamil mt-0.5">இயந்திர செயலிழப்பு</div>
          </button>
        </div>
      </div>
    </div>
  );
};
