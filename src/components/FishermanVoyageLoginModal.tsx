import React, { useState } from 'react';
import { BoatState } from '../types/marine';
import { 
  Anchor, 
  Users, 
  KeyRound, 
  Compass, 
  MapPin, 
  ShieldCheck, 
  Ship, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react';

interface FishermanVoyageLoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentBoat: BoatState;
  onCompleteLogin: (details: {
    name: string;
    regNumber: string;
    skipperName: string;
    crewCount: number;
    homePort: string;
  }) => void;
}

export const FishermanVoyageLoginModal: React.FC<FishermanVoyageLoginModalProps> = ({
  isOpen,
  onClose,
  currentBoat,
  onCompleteLogin,
}) => {
  const [boatName, setBoatName] = useState(currentBoat.name);
  const [regNumber, setRegNumber] = useState(currentBoat.regNumber);
  const [skipperName, setSkipperName] = useState(currentBoat.skipperName || 'Anthony Raj (அந்தோணி ராஜ்)');
  const [crewCount, setCrewCount] = useState(currentBoat.crewCount || 5);
  const [homePort, setHomePort] = useState(currentBoat.homePort || 'Rameswaram Fishing Jetty');
  const [password, setPassword] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boatName.trim()) {
      setErrorMsg('Please enter boat name (படகு பெயரை உள்ளிடவும்)');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter voyage password / PIN (கடவுச்சொல் உள்ளிடவும்)');
      return;
    }

    onCompleteLogin({
      name: boatName.trim(),
      regNumber: regNumber.trim() || 'IND-TN-10-MM-4492',
      skipperName: skipperName.trim() || 'Skipper',
      crewCount: Math.max(1, crewCount),
      homePort: homePort.trim(),
    });

    if (onClose) onClose();
  };

  const handleQuickPreset = (preset: { name: string; reg: string; port: string; crew: number }) => {
    setBoatName(preset.name);
    setRegNumber(preset.reg);
    setHomePort(preset.port);
    setCrewCount(preset.crew);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-950/60 border border-cyan-400/40">
              <Ship className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Fisherman Voyage Check-In
              </h2>
              <p className="text-xs font-tamil text-cyan-300">
                மீனவர் படகு & பயண பதிவு (Login)
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Info notice */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Please verify vessel identity and onboard crew count. This telemetry is transmitted via LoRa mesh to the Coast Guard and displays on the live maritime radar.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Harbor Select (துறைமுக படகுகள்):
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickPreset({
                name: 'Annai Velankanni (அன்னை வேளாங்கண்ணி)',
                reg: 'IND-TN-10-MM-4492',
                port: 'Rameswaram Jetty',
                crew: 5,
              })}
              className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
            >
              <div className="font-bold text-white text-[11px] truncate">Rameswaram</div>
              <div className="text-[10px] text-cyan-400">5 Crew • IND-TN-10</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPreset({
                name: 'Kadal Thalaivan (கடல் தலைவன்)',
                reg: 'IND-TN-10-F-8102',
                port: 'Mandapam South Jetty',
                crew: 4,
              })}
              className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
            >
              <div className="font-bold text-white text-[11px] truncate">Mandapam</div>
              <div className="text-[10px] text-cyan-400">4 Crew • IND-TN-10</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPreset({
                name: 'Pamban Paalam (பாம்பன் பாலம்)',
                reg: 'IND-TN-06-MM-2201',
                port: 'Pamban Light Pier',
                crew: 6,
              })}
              className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all"
            >
              <div className="font-bold text-white text-[11px] truncate">Pamban</div>
              <div className="text-[10px] text-cyan-400">6 Crew • IND-TN-06</div>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Boat Name */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <Ship className="w-3.5 h-3.5 text-cyan-400" />
              Boat Name (படகு பெயர்)
            </label>
            <input
              type="text"
              value={boatName}
              onChange={(e) => setBoatName(e.target.value)}
              placeholder="e.g. Annai Velankanni"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              required
            />
          </div>

          {/* Registration Number & Skipper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Anchor className="w-3.5 h-3.5 text-cyan-400" />
                Vessel Reg ID (பதிவு எண்)
              </label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="IND-TN-10-MM-4492"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono-num"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Skipper Name (சுக்கான்)
              </label>
              <input
                type="text"
                value={skipperName}
                onChange={(e) => setSkipperName(e.target.value)}
                placeholder="Anthony Raj"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Crew Members Count & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Crew Count (மீனவர்கள் எண்ணிக்கை)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCrewCount(c => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
                >
                  -
                </button>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 text-center font-mono-num font-bold text-cyan-400 text-sm">
                  {crewCount} Members
                </div>
                <button
                  type="button"
                  onClick={() => setCrewCount(c => Math.min(16, c + 1))}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Departure Port (துறைமுகம்)
              </label>
              <input
                type="text"
                value={homePort}
                onChange={(e) => setHomePort(e.target.value)}
                placeholder="Rameswaram Jetty"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Password / Voyage Security PIN */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Voyage Password / Token PIN (கடவுச்சொல்)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter PIN (e.g. 1234)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono-num"
              required
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Default demo password: <code className="text-cyan-400">1234</code>
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-cyan-950/60 border border-cyan-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 mt-1"
          >
            <span>Proceed to Navigation & Alerts (உள்நுழைவு)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
