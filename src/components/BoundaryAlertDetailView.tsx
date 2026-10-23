import React from 'react';
import { BoatState, AlertState } from '../types/marine';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Volume2, 
  VolumeX, 
  Navigation, 
  Compass, 
  Radio, 
  CheckCircle2, 
  Sparkles,
  Info,
  MapPin,
  Volume1
} from 'lucide-react';
import { marineAudio } from '../utils/soundAndVoice';

interface BoundaryAlertDetailViewProps {
  boat: BoatState;
  alert: AlertState;
  isMuted: boolean;
  onToggleMute: () => void;
  voiceLang: 'ta' | 'en' | 'both';
  onChangeVoiceLang: (lang: 'ta' | 'en' | 'both') => void;
  onJumpToPreset: (presetKey: string) => void;
}

export const BoundaryAlertDetailView: React.FC<BoundaryAlertDetailViewProps> = ({
  boat,
  alert,
  isMuted,
  onToggleMute,
  voiceLang,
  onChangeVoiceLang,
  onJumpToPreset,
}) => {
  return (
    <div className="flex flex-col gap-4 text-slate-100">
      {/* Primary Alert Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        alert.level === 'BREACH'
          ? 'bg-rose-950/90 border-rose-500 shadow-2xl shadow-rose-950/80 animate-pulse'
          : alert.level === 'RED'
          ? 'bg-red-950/80 border-red-500 shadow-xl shadow-red-950/60'
          : alert.level === 'ORANGE'
          ? 'bg-amber-950/70 border-amber-500 shadow-lg shadow-amber-950/40'
          : alert.level === 'YELLOW'
          ? 'bg-yellow-950/50 border-yellow-500 shadow-yellow-950/30'
          : 'bg-slate-900/90 border-emerald-500/40'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-xl shrink-0 ${
              alert.level === 'BREACH' ? 'bg-rose-600 text-white animate-bounce' :
              alert.level === 'RED' ? 'bg-red-600 text-white animate-pulse' :
              alert.level === 'ORANGE' ? 'bg-amber-500 text-slate-950 font-bold' :
              alert.level === 'YELLOW' ? 'bg-yellow-400 text-slate-950 font-bold' :
              'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
            }`}>
              {alert.level === 'BREACH' || alert.level === 'RED' ? (
                <Flame className="w-6 h-6" />
              ) : alert.level === 'ORANGE' || alert.level === 'YELLOW' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-white font-mono-num">
                  LEVEL: {alert.level}
                </span>
                <span className="text-xs text-slate-400">
                  {alert.distanceMeters >= 1000
                    ? `${(alert.distanceMeters / 1000).toFixed(2)} km to IMBL`
                    : `${alert.distanceMeters}m to IMBL`}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                {alert.messageEn}
              </h2>
              <p className="text-sm font-tamil text-amber-300 font-semibold mt-0.5">
                {alert.messageTa}
              </p>
            </div>
          </div>

          {/* Quick Voice Play */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => marineAudio.speakAlert(alert.messageTa, alert.messageEn, alert.level, true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer active:scale-95"
            >
              <Volume1 className="w-4 h-4" />
              <span className="font-tamil">ஒலி கேட்க</span>
            </button>
          </div>
        </div>

        {/* Safe Return Direction Recommendation */}
        {alert.level !== 'SAFE' && (
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center shrink-0 shadow-lg"
                style={{ transform: `rotate(${alert.safeReturnBearing}deg)` }}
              >
                <Navigation className="w-6 h-6 text-cyan-300 fill-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-white">
                  <span className="font-bold text-cyan-300">Safe Course: </span>
                  Steer heading <strong className="text-white text-sm font-mono-num font-bold">{alert.safeReturnBearing}° {alert.safeReturnDirectionEn}</strong> for{' '}
                  <strong className="text-cyan-300 font-bold">{(alert.safeReturnDistanceMeters / 1000).toFixed(1)} km</strong> to enter safe Indian waters.
                </p>
                <p className="text-xs font-tamil text-amber-200 mt-0.5">
                  பாதுகாப்பான வழி: <strong className="text-white">{alert.safeReturnDirectionTa}</strong> திசையில் {alert.safeReturnBearing}° கோணத்தில் செல்லவும்.
                </p>
              </div>
            </div>

            <div className="text-[11px] px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold shrink-0">
              🧭 Pure Advisory Guidance
            </div>
          </div>
        )}
      </div>

      {/* Domain Reality Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-white">
            Operational Protocol: Advisory Alert & Navigation Guidance Only
          </p>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Sea Guardian provides real-time acoustic alarms, flashing beacons, Tamil voice warnings, and compass course guidance. The system does not mechanically steer, stop, or reverse the vessel's diesel engine. The skipper and crew maintain full command of the vessel's helm at all times.
          </p>
          <p className="text-cyan-300 font-tamil text-[11px]">
            இக்கருவி எச்சரிக்கை மற்றும் வழிகாட்டுதலை மட்டுமே வழங்கும். படகின் இயந்திரத்தை தானாக திருப்பாது அல்லது பின்னோக்கி செலுத்தாது.
          </p>
        </div>
      </div>

      {/* 4 Multi-Tier Boundary Zones Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tier 1: Safe Waters */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          alert.level === 'SAFE'
            ? 'bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-950/60'
            : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Green Zone (Safe)
            </span>
            <span className="text-[10px] text-slate-400">&gt; 2.0 km</span>
          </div>
          <p className="text-xs text-slate-300">
            Vessel is inside Indian territorial waters with ample clearance.
          </p>
          <p className="text-[11px] font-tamil text-slate-400 mt-1">
            பாதுகாப்பான இந்திய கடல் எல்லை.
          </p>
          <button
            onClick={() => onJumpToPreset('SAFE')}
            className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-300 font-semibold transition-colors"
          >
            Simulate Safe Zone
          </button>
        </div>

        {/* Tier 2: Yellow Caution */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          alert.level === 'YELLOW'
            ? 'bg-yellow-950/70 border-yellow-500 shadow-lg shadow-yellow-950/60'
            : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-yellow-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Yellow Alert
            </span>
            <span className="text-[10px] text-slate-400">2.0 km - 1.0 km</span>
          </div>
          <p className="text-xs text-slate-300">
            Approaching international boundary. Buzzer beeps periodically.
          </p>
          <p className="text-[11px] font-tamil text-slate-400 mt-1">
            எச்சரிக்கை: எல்லை வரம்பு நெருங்குகிறது.
          </p>
          <button
            onClick={() => onJumpToPreset('YELLOW')}
            className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-yellow-300 font-semibold transition-colors"
          >
            Simulate Yellow (1.8km)
          </button>
        </div>

        {/* Tier 3: Orange Warning */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          alert.level === 'ORANGE'
            ? 'bg-amber-950/70 border-amber-500 shadow-lg shadow-amber-950/60'
            : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Orange Alert
            </span>
            <span className="text-[10px] text-slate-400">1.0 km - 500 m</span>
          </div>
          <p className="text-xs text-slate-300">
            High proximity to IMBL. Tamil voice prompt announces safe return course.
          </p>
          <p className="text-[11px] font-tamil text-slate-400 mt-1">
            ஆரஞ்சு எச்சரிக்கை: திரும்பவும்.
          </p>
          <button
            onClick={() => onJumpToPreset('ORANGE')}
            className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 font-semibold transition-colors"
          >
            Simulate Orange (850m)
          </button>
        </div>

        {/* Tier 4: Red Critical & Breach */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          alert.level === 'RED' || alert.level === 'BREACH'
            ? 'bg-rose-950/70 border-rose-500 shadow-lg shadow-rose-950/60'
            : 'bg-slate-900/70 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-rose-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              Red / Breach
            </span>
            <span className="text-[10px] text-slate-400">≤ 500m / Crossed</span>
          </div>
          <p className="text-xs text-slate-300">
            Critical boundary breach danger. Siren sounds continuously.
          </p>
          <p className="text-[11px] font-tamil text-slate-400 mt-1">
            அபாய சிவப்பு எச்சரிக்கை / எல்லை மீறல்.
          </p>
          <button
            onClick={() => onJumpToPreset('RED')}
            className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-rose-300 font-semibold transition-colors"
          >
            Simulate Red (380m)
          </button>
        </div>
      </div>

      {/* Voice & Hardware Settings Panel */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Audio & Speech Configuration
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Onboard Piezoelectric Siren & Web Speech Voice Engine
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mute toggle */}
          <button
            onClick={onToggleMute}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-950 border border-rose-800 text-rose-300'
                : 'bg-emerald-950 border border-emerald-800 text-emerald-300'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Alarms Muted' : 'Alarms Active'}</span>
          </button>

          {/* Language selector */}
          <div className="flex bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => onChangeVoiceLang('ta')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                voiceLang === 'ta' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              தமிழ் (Tamil)
            </button>
            <button
              onClick={() => onChangeVoiceLang('en')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                voiceLang === 'en' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => onChangeVoiceLang('both')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                voiceLang === 'both' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Both (இருமொழியும்)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
