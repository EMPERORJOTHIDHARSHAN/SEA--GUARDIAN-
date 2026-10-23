import React from 'react';
import { BoatState } from '../types/marine';
import { calculateHaversineDistance, calculateBearing } from '../utils/marineCalculations';
import { 
  Radar, 
  Ship, 
  Users, 
  Compass, 
  Radio, 
  AlertTriangle, 
  ShieldCheck, 
  Gauge, 
  Wifi,
  Navigation
} from 'lucide-react';

interface NearbyVesselsRadarProps {
  primaryBoat: BoatState;
  fleetBoats: BoatState[];
  onSelectVessel?: (boat: BoatState) => void;
}

export const NearbyVesselsRadar: React.FC<NearbyVesselsRadarProps> = ({
  primaryBoat,
  fleetBoats,
  onSelectVessel,
}) => {
  // Compute distance and bearing from primary boat to every fleet boat
  const nearbyList = fleetBoats
    .map((fb) => {
      const distanceMeters = calculateHaversineDistance(
        { lat: primaryBoat.lat, lng: primaryBoat.lng },
        { lat: fb.lat, lng: fb.lng }
      );
      const bearing = calculateBearing(
        { lat: primaryBoat.lat, lng: primaryBoat.lng },
        { lat: fb.lat, lng: fb.lng }
      );

      // Relative cardinal direction
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const dirIndex = Math.round(bearing / 45) % 8;
      const cardinalDir = dirs[dirIndex];

      return {
        ...fb,
        distanceMeters,
        bearing,
        cardinalDir,
        isVeryClose: distanceMeters < 800, // Within 800m
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col gap-3 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Radar className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Nearby Vessels & AIS Traffic
            </h3>
            <p className="text-[11px] font-tamil text-slate-400">
              அருகிலுள்ள படகுகள் & கடல் போக்குவரத்து ({nearbyList.length} படகுகள் கண்டறியப்பட்டது)
            </p>
          </div>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 uppercase">
          LORA AIS MESH
        </span>
      </div>

      {/* Proximity collision advisory if any vessel is closer than 800m */}
      {nearbyList.some(b => b.isVeryClose) && (
        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Proximity Notice: </strong> Another fishing boat is within 800m. Maintain safe lookout & navigation lighting!
          </span>
        </div>
      )}

      {/* Vessels List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {nearbyList.map((boat) => {
          const distKm = (boat.distanceMeters / 1000).toFixed(2);
          const isClose = boat.distanceMeters < 1000;

          return (
            <div
              key={boat.id}
              onClick={() => onSelectVessel && onSelectVessel(boat)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isClose
                  ? 'bg-slate-950/90 border-cyan-500/50 hover:border-cyan-400'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                    isClose ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-300'
                  }`}>
                    ⛵
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                      {boat.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono-num">
                      {boat.regNumber}
                    </p>
                  </div>
                </div>

                {/* Distance Badge */}
                <div className="text-right">
                  <span className={`text-xs font-mono-num font-extrabold ${
                    boat.isVeryClose ? 'text-amber-400' : 'text-cyan-300'
                  }`}>
                    {boat.distanceMeters < 1000 ? `${Math.round(boat.distanceMeters)}m` : `${distKm} km`}
                  </span>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Bearing {boat.cardinalDir} ({Math.round(boat.bearing)}°)
                  </div>
                </div>
              </div>

              {/* Vessel Telemetry strip */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>{boat.sog} kts</span>
                </div>
                <div className="flex items-center gap-1">
                  <Compass className="w-3 h-3 text-cyan-400" />
                  <span>{boat.cog}°</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-cyan-400" />
                  <span>{boat.crewCount} Crew</span>
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500">
                <span>Port: {boat.homePort}</span>
                <span className="text-cyan-400 font-medium">LoRa {boat.loraSignalRssi}dBm</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
