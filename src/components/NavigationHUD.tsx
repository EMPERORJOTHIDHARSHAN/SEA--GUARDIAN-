import React from 'react';
import { BoatState, AlertState } from '../types/marine';
import { 
  Compass, 
  Gauge, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sparkles,
  Wifi,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Volume1
} from 'lucide-react';
import { marineAudio } from '../utils/soundAndVoice';

interface NavigationHUDProps {
  boat: BoatState;
  alert: AlertState;
  isMuted: boolean;
  onToggleMute: () => void;
  voiceLang: 'ta' | 'en' | 'both';
  onChangeVoiceLang: (lang: 'ta' | 'en' | 'both') => void;
  onTriggerSOSModal: () => void;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  boat,
  alert,
  isMuted,
  onToggleMute,
  voiceLang,
  onChangeVoiceLang,
  onTriggerSOSModal,
}) => {
  // Nautical Lat/Lng formatting
  const formatCoord = (val: number, isLat: boolean) => {
    const deg = Math.floor(Math.abs(val));
    const min = ((Math.abs(val) - deg) * 60).toFixed(3);
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    return `${deg.toString().padStart(2, '0')}°${min}' ${dir}`;
  };

  // Alert level styles
  const getAlertBanner = () => {
    switch (alert.level) {
      case 'BREACH':
        return {
          bg: 'bg-rose-950/90 border-rose-500 shadow-rose-950/80 shadow-2xl animate-pulse',
          badge: 'bg-rose-600 text-white animate-bounce',
          text: 'text-rose-300',
          title: '🚨 BORDER BREACH! INTERNATIONAL WATERS',
          titleTa: '🚨 எல்லை மீறல்! சர்வதேச கடல் எல்லை கடக்கப்பட்டது!',
        };
      case 'RED':
        return {
          bg: 'bg-red-950/80 border-red-500 shadow-red-950/50 shadow-xl',
          badge: 'bg-red-600 text-white animate-pulse',
          text: 'text-red-200',
          title: '⚠️ CRITICAL RED ALERT (≤ 500m BUFFER)',
          titleTa: '⚠️ அபாய எல்லை! 500 மீட்டருக்குள் எல்லை உள்ளது!',
        };
      case 'ORANGE':
        return {
          bg: 'bg-amber-950/70 border-amber-500 shadow-amber-950/40 shadow-lg',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          text: 'text-amber-200',
          title: '⚠️ ORANGE ALERT (≤ 1.0 km BUFFER)',
          titleTa: '⚠️ ஆரஞ்சு எச்சரிக்கை! 1 கி.மீ எல்லை வரம்பு!',
        };
      case 'YELLOW':
        return {
          bg: 'bg-yellow-950/50 border-yellow-500 shadow-yellow-950/30',
          badge: 'bg-yellow-400 text-slate-950 font-bold',
          text: 'text-yellow-200',
          title: '⚡ YELLOW ALERT (≤ 2.0 km BUFFER)',
          titleTa: '⚡ மஞ்சள் எச்சரிக்கை! 2 கி.மீ எல்லை வரம்பு!',
        };
      default:
        return {
          bg: 'bg-slate-900/80 border-cyan-800/60',
          badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
          text: 'text-slate-300',
          title: '✅ INDIAN TERRITORIAL WATERS (SAFE)',
          titleTa: '✅ இந்திய கடல் எல்லைக்குள் உள்ளீர்கள் (பாதுகாப்பானது)',
        };
    }
  };

  const alertStyle = getAlertBanner();

  // Progress to border (0m = 100%, 2000m = 0%)
  const proximityPercent = Math.min(
    100,
    Math.max(0, Math.round(((2000 - Math.min(2000, alert.distanceMeters)) / 2000) * 100))
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* Alert Notification Header Bar */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 ${alertStyle.bg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className={`px-2.5 py-1 text-xs uppercase tracking-wider font-extrabold rounded-lg shrink-0 ${alertStyle.badge}`}>
              {alert.level}
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                {alertStyle.title}
              </h2>
              <p className="text-xs sm:text-sm font-tamil font-semibold text-amber-300/95 mt-0.5">
                {alertStyle.titleTa}
              </p>
            </div>
          </div>

          {/* Quick Actions (Voice Mute, Test Voice, SOS trigger) */}
          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            {/* Replay Tamil Audio Alert */}
            <button
              onClick={() => {
                marineAudio.speakAlert(alert.messageTa, alert.messageEn, alert.level, true);
              }}
              title="Replay Voice Alert (ஒலி எச்சரிக்கை)"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-tamil text-xs">ஒலி கேட்க</span>
            </button>

            {/* Language Selector */}
            <div className="flex bg-slate-800/90 rounded-xl p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => onChangeVoiceLang('ta')}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  voiceLang === 'ta' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
              <button
                onClick={() => onChangeVoiceLang('en')}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  voiceLang === 'en' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => onChangeVoiceLang('both')}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  voiceLang === 'both' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Both
              </button>
            </div>

            {/* Audio Buzzer Mute Toggle */}
            <button
              onClick={onToggleMute}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                  : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              }`}
              title={isMuted ? 'Unmute Audio Alarm & Tamil Voice' : 'Mute Audio Alarm'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* SOS Emergency button in top bar */}
            <button
              onClick={onTriggerSOSModal}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg shadow-red-900/50 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>SOS</span>
            </button>
          </div>
        </div>

        {/* Dynamic Safe Return Advisory (No auto-steering: manual heading guidance for the fisherman) */}
        {alert.level !== 'SAFE' && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950/40 p-2.5 rounded-xl">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950"
                style={{ transform: `rotate(${alert.safeReturnBearing}deg)` }}
                title={`Recommended Safe Bearing: ${alert.safeReturnBearing}°`}
              >
                <Navigation className="w-5 h-5 text-cyan-300 fill-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-cyan-100 font-medium">
                  <span className="font-bold text-white">Recommended Course: </span>
                  Steer heading <strong className="text-cyan-300 font-bold text-sm">{alert.safeReturnBearing}° {alert.safeReturnDirectionEn}</strong> for{' '}
                  <strong className="text-cyan-300 font-bold text-sm">{(alert.safeReturnDistanceMeters / 1000).toFixed(1)} km</strong> to reach safe Indian waters.
                </p>
                <p className="text-xs font-tamil text-amber-200 mt-0.5">
                  வழிகாட்டுதல்: <strong className="text-white font-bold">{alert.safeReturnDirectionTa}</strong> திசையில் {alert.safeReturnBearing}° கோணத்தில் படகை செலுத்தவும்.
                </p>
              </div>
            </div>

            <div className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold self-start sm:self-auto shrink-0">
              🧭 Manual Steering Advisory
            </div>
          </div>
        )}
      </div>

      {/* Marine Instrument Cluster - Mobile friendly 2-col to 4-col */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {/* Distance to IMBL */}
        <div className="col-span-2 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${alert.level === 'SAFE' ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
              Distance to Maritime Border (IMBL)
            </span>
            <span className="text-[10px] text-slate-500">1974 Treaty</span>
          </div>

          <div className="flex items-baseline gap-2 my-1">
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono-num ${
              alert.level === 'BREACH' ? 'text-rose-400 animate-pulse' :
              alert.level === 'RED' ? 'text-red-400' :
              alert.level === 'ORANGE' ? 'text-amber-400' :
              alert.level === 'YELLOW' ? 'text-yellow-300' : 'text-emerald-400'
            }`}>
              {alert.level === 'BREACH' ? '-' : ''}
              {alert.distanceMeters >= 1000
                ? `${(alert.distanceMeters / 1000).toFixed(2)} km`
                : `${alert.distanceMeters} m`}
            </span>
            <span className="text-xs text-slate-400">
              {alert.level === 'BREACH' ? '(Crossed into LK Waters)' : 'to nearest boundary'}
            </span>
          </div>

          {/* Buffer Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-500 ${
                alert.level === 'BREACH' ? 'bg-rose-600 w-full animate-pulse' :
                alert.level === 'RED' ? 'bg-red-500' :
                alert.level === 'ORANGE' ? 'bg-amber-500' :
                alert.level === 'YELLOW' ? 'bg-yellow-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${alert.level === 'BREACH' ? 100 : proximityPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 mt-1">
            <span>Safe (&gt;2km)</span>
            <span>2km (Yel)</span>
            <span>1km (Org)</span>
            <span>500m (Red)</span>
            <span>IMBL (0m)</span>
          </div>
        </div>

        {/* Speed Over Ground (SOG) */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-[11px]">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              SOG (Speed)
            </span>
            <span className="text-[10px] text-cyan-400 font-mono-num font-bold">KTS</span>
          </div>
          <div className="my-1">
            <span className="text-2xl font-bold font-mono-num text-white">
              {boat.sog.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 ml-1">kts</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {(boat.sog * 1.852).toFixed(1)} km/h
          </div>
        </div>

        {/* Course Over Ground (COG) & Heading */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-[11px]">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              COG (Heading)
            </span>
            <span className="text-[10px] text-cyan-400 font-mono-num font-bold">GYRO</span>
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono-num text-white">
              {boat.cog.toString().padStart(3, '0')}°
            </span>
            <span className="text-xs text-cyan-300 font-semibold">
              {boat.cog >= 337.5 || boat.cog < 22.5 ? 'N' :
               boat.cog < 67.5 ? 'NE' :
               boat.cog < 112.5 ? 'E' :
               boat.cog < 157.5 ? 'SE' :
               boat.cog < 202.5 ? 'S' :
               boat.cog < 247.5 ? 'SW' :
               boat.cog < 292.5 ? 'W' : 'NW'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Safe: {alert.safeReturnBearing}° {alert.safeReturnDirectionEn}
          </div>
        </div>

        {/* GPS Live Coordinates */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-[11px]">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              GPS Fix
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-num font-bold">
              3D FIX
            </span>
          </div>
          <div className="font-mono-num text-[11px] font-semibold text-slate-200 my-1 space-y-0.5">
            <div>{formatCoord(boat.lat, true)}</div>
            <div>{formatCoord(boat.lng, false)}</div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Sats: {boat.satelliteCount}</span>
            <span>HDOP: {boat.hdop}</span>
          </div>
        </div>

        {/* Vessel Safety Link & Battery Status */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-[11px]">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              Safety Link (இணைப்பு)
            </span>
            <span className="text-[9px] text-emerald-400 font-bold">CONNECTED</span>
          </div>
          <div className="text-xs my-1 text-slate-200">
            <span className="text-cyan-300 font-semibold text-[11px]">Coast Guard 1554 Ready</span>
            <span className="block text-[10px] text-slate-400">Emergency Link Active</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Battery: {boat.batteryVolts}V</span>
            <span>Fuel: {boat.fuelPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
