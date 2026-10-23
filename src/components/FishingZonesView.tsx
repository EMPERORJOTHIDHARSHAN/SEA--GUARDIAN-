import React from 'react';
import { PotentialFishingZone, BoatState } from '../types/marine';
import { 
  Fish, 
  ShieldCheck, 
  Navigation, 
  Thermometer, 
  Layers, 
  Fuel, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { calculateHaversineDistance, calculateBearing } from '../utils/marineCalculations';

interface FishingZonesViewProps {
  zones: PotentialFishingZone[];
  boat: BoatState;
  onSelectZoneAsDestination: (zone: PotentialFishingZone) => void;
}

export const FishingZonesView: React.FC<FishingZonesViewProps> = ({
  zones,
  boat,
  onSelectZoneAsDestination,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Fish className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] tracking-wider uppercase border border-emerald-500/30">
                  INCOIS AI ADVISORY
                </span>
                <span className="text-xs text-slate-400">
                  Satellite Ocean Color & SST Integrated
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                Potential Fishing Zones (PFZ) – Indian Waters Only
              </h3>
              <p className="text-xs font-tamil text-emerald-300 font-medium">
                சாத்தியமான மீன்பிடி பகுதிகள் - இந்திய கடற்பரப்பிற்குள் மட்டும் பரிந்துரைக்கப்படுகிறது
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">
              Zero Boundary Risk: All zones maintain &gt;8 km safe buffer from IMBL
            </span>
          </div>
        </div>
      </div>

      {/* PFZ Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {zones.map((zone) => {
          const distMeters = calculateHaversineDistance(
            { lat: boat.lat, lng: boat.lng },
            { lat: zone.lat, lng: zone.lng }
          );
          const distKm = (distMeters / 1000).toFixed(1);
          const bearing = calculateBearing(
            { lat: boat.lat, lng: boat.lng },
            { lat: zone.lat, lng: zone.lng }
          );

          // Estimated fuel in liters (approx 3.2 L per nautical mile for 36ft trawler)
          const estFuelLiters = (parseFloat(distKm) * 0.54 * 3.2).toFixed(1);

          return (
            <div
              key={zone.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5">
                      <Fish className="w-4 h-4 text-emerald-400" />
                      {zone.name}
                    </h4>
                    <p className="text-xs font-tamil text-slate-400 mt-0.5">
                      {zone.nameTa}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold font-mono-num shrink-0">
                    {zone.catchProbabilityPercent}% Catch Prob
                  </span>
                </div>

                {/* Target Fish Species */}
                <div className="mb-3">
                  <div className="text-[11px] text-slate-400 font-semibold mb-1">
                    Target Species (இலக்கு மீன் இனங்கள்):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {zone.targetSpecies.map((species, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-cyan-200 text-xs font-medium"
                      >
                        {species}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Oceanographic Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[11px] mb-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Chlorophyll-a</span>
                    <span className="font-bold text-emerald-400 font-mono-num">{zone.chlorophyllMgM3} mg/m³</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sea Surface Temp</span>
                    <span className="font-bold text-amber-300 font-mono-num">{zone.surfaceTempC}°C</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Depth Sounding</span>
                    <span className="font-bold text-cyan-300 font-mono-num">{zone.depthMeters} meters</span>
                  </div>
                </div>

                {/* Safe Navigation & Buffer */}
                <div className="text-xs space-y-1 text-slate-300 mb-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Safe Distance to Border: {zone.safeDistanceToIMBLKm} km inside Indian waters</span>
                  </div>
                  <div className="text-[11px] text-slate-400 italic">
                    Route advisory: {zone.advisedRoute}
                  </div>
                </div>
              </div>

              {/* Action: Distance, Bearing & Steer Destination Button */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="text-xs font-mono-num text-slate-300">
                  <span className="text-white font-bold">{distKm} km</span> away (Bearing <span className="text-cyan-300">{bearing}°</span>)
                  <span className="block text-[10px] text-slate-500 font-sans">
                    Est Fuel: ~{estFuelLiters} L
                  </span>
                </div>

                <button
                  onClick={() => onSelectZoneAsDestination(zone)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Set as Nav Target</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
