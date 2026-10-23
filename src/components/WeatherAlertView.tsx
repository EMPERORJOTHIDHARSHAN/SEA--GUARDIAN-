import React from 'react';
import { WeatherData } from '../types/marine';
import { 
  CloudRain, 
  Wind, 
  Waves, 
  Thermometer, 
  Compass, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Volume2, 
  Info,
  Clock
} from 'lucide-react';
import { marineAudio } from '../utils/soundAndVoice';

interface WeatherAlertViewProps {
  weather: WeatherData;
  onUpdateWeather: (newWeather: WeatherData) => void;
}

export const WeatherAlertView: React.FC<WeatherAlertViewProps> = ({
  weather,
  onUpdateWeather,
}) => {
  const getCycloneBadge = () => {
    switch (weather.cycloneStatus) {
      case 'DANGER_RED':
        return {
          bg: 'bg-rose-950/80 border-rose-600',
          badge: 'bg-rose-600 text-white animate-pulse',
          title: 'CYCLONE WARNING - SEVERE DANGER',
        };
      case 'WARNING_ORANGE':
        return {
          bg: 'bg-amber-950/80 border-amber-500',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          title: 'CYCLONE ALERT - ROUGH SEA ADVISORY',
        };
      case 'ALERT_YELLOW':
        return {
          bg: 'bg-yellow-950/60 border-yellow-500',
          badge: 'bg-yellow-400 text-slate-950 font-bold',
          title: 'DEPRESSION ADVISORY - SQUALLY WEATHER',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800',
          badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
          title: 'NORMAL MARINE WEATHER CONDITIONS',
        };
    }
  };

  const cycloneStyle = getCycloneBadge();

  // Voice broadcast weather bulletin in Tamil & English
  const handleBroadcastWeatherVoice = () => {
    marineAudio.speakAlert(
      `வானிலை எச்சரிக்கை! கடலில் காற்றின் வேகம் மணிக்கு ${Math.round(weather.windKnots * 1.852)} கிலோமீட்டர். அலை உயரம் ${weather.waveHeightM} மீட்டர். மீனவர்கள் எச்சரிக்கையுடன் இருக்கவும்.`,
      `Marine Weather Advisory: Wind speed ${weather.windKnots} knots. Wave height ${weather.waveHeightM} meters. Exercise caution in Palk Bay.`,
      'YELLOW',
      true
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Cyclone Early Warning Banner */}
      <div className={`p-4 rounded-2xl border backdrop-blur-md transition-all ${cycloneStyle.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase tracking-wider ${cycloneStyle.badge}`}>
                  {weather.cycloneStatus.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Valid: {weather.validUntil}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {weather.cycloneTitleEn}
              </h3>
              <p className="text-xs sm:text-sm font-tamil text-amber-300 font-medium">
                {weather.cycloneTitleTa}
              </p>
            </div>
          </div>

          <button
            onClick={handleBroadcastWeatherVoice}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 self-start md:self-auto cursor-pointer shadow transition-all"
          >
            <Volume2 className="w-4 h-4 text-slate-950" />
            <span>Voice Broadcast</span>
            <span className="font-tamil text-xs">வானிலை ஒலிபரப்பு</span>
          </button>
        </div>

        {/* Detailed Advisory */}
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-300 space-y-1">
          <p className="leading-relaxed">
            <strong className="text-white">Advisory: </strong>
            {weather.advisoryEn}
          </p>
          <p className="leading-relaxed font-tamil text-amber-200/90">
            <strong>அறிவுறுத்தல்: </strong>
            {weather.advisoryTa}
          </p>
          <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-1">
            <Info className="w-3 h-3 text-cyan-400" />
            <span>Source: {weather.issuedBy}</span>
          </div>
        </div>
      </div>

      {/* Marine Weather Instrument Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Wind Speed & Gusts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-cyan-400" />
              Wind Speed
            </span>
            <span className="text-[10px] text-cyan-400">BEAUFORT 5</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold font-mono-num text-white">
              {weather.windKnots}
            </span>
            <span className="text-xs text-slate-400 ml-1">kts</span>
            <div className="text-xs text-amber-300 font-semibold mt-0.5">
              Gusts up to {weather.gustKnots} kts
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-tamil">
            காற்றின் வேகம்: {(weather.windKnots * 1.852).toFixed(0)} கி.மீ/மணி
          </div>
        </div>

        {/* Wave Height & Swell */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-cyan-400" />
              Wave Height
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              {weather.seaState}
            </span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold font-mono-num text-white">
              {weather.waveHeightM.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 ml-1">meters</span>
            <div className="text-xs text-cyan-300 font-semibold mt-0.5">
              Swell Period: {weather.swellPeriodSec}s
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-tamil">
            அலை உயரம்: {weather.seaStateTa}
          </div>
        </div>

        {/* Wind Direction & Compass */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              Wind Direction
            </span>
            <span className="text-[10px] text-slate-400">{weather.windDirectionDeg}°</span>
          </div>
          <div className="my-2 flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/40 flex items-center justify-center shrink-0"
              style={{ transform: `rotate(${weather.windDirectionDeg}deg)` }}
            >
              <Wind className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white leading-tight">
                {weather.windDirectionLabel.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-400">
                Towards Palk Bay
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-tamil truncate">
            {weather.windDirectionLabel}
          </div>
        </div>

        {/* Sea Surface Temp & Salinity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              Sea Surface Temp
            </span>
            <span className="text-[10px] text-emerald-400">NORMAL</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold font-mono-num text-white">
              {weather.waterTempC}
            </span>
            <span className="text-xs text-slate-400 ml-1">°C</span>
            <div className="text-xs text-slate-400 mt-0.5">
              Pressure: {weather.airPressureHpa} hPa
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-tamil">
            கடல் வெப்பநிலை
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              Visibility
            </span>
            <span className="text-[10px] text-cyan-400">FAIR</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold font-mono-num text-white">
              {weather.visibilityKm}
            </span>
            <span className="text-xs text-slate-400 ml-1">km</span>
            <div className="text-xs text-emerald-400 font-semibold mt-0.5">
              Daylight Clear
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-tamil">
            பார்வை தூரம்
          </div>
        </div>
      </div>

      {/* Weather Simulation Controls (For Live Hackathon Demonstration) */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-300">
            Simulate IMD Weather Scenarios:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => onUpdateWeather({
              ...weather,
              seaState: 'Calm',
              seaStateTa: 'அமைதியான கடல்',
              waveHeightM: 0.8,
              windKnots: 10,
              gustKnots: 14,
              cycloneStatus: 'NO_WARNING',
              cycloneTitleEn: 'Normal Weather: Safe for Deep Sea Fishing',
              cycloneTitleTa: 'சாதாரண வானிலை: கடலுக்குள் செல்ல பாதுகாப்பானது',
              advisoryEn: 'Calm seas with light breeze across Palk Strait. Good fishing conditions.',
              advisoryTa: 'பாக் ஜலசந்தியில் மிதமான தென்றல் காற்றுடன் அமைதியான கடல். மீன்பிடிக்க உகந்தது.',
            })}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            🟢 Calm Weather (Normal)
          </button>

          <button
            onClick={() => onUpdateWeather({
              ...weather,
              seaState: 'Moderate',
              seaStateTa: 'மிதமான கடல் அலை',
              waveHeightM: 1.6,
              windKnots: 22,
              gustKnots: 30,
              cycloneStatus: 'ALERT_YELLOW',
              cycloneTitleEn: 'Depression Advisory: Caution in Palk Bay',
              cycloneTitleTa: 'காற்றழுத்த தாழ்வு நிலை: எச்சரிக்கை',
              advisoryEn: 'Wind speed 40-50 kmph. Country craft advised to stay within 10 NM.',
              advisoryTa: 'காற்று வேகம் 40-50 கி.மீ. நாட்டுப் படகுகள் 10 கடல் மைலுக்குள் இருக்குமாறு அறிவுறுத்தப்படுகிறது.',
            })}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-yellow-950/80 border border-slate-700 hover:border-yellow-500 text-slate-300 hover:text-yellow-300 transition-colors cursor-pointer"
          >
            🟡 Yellow Depression
          </button>

          <button
            onClick={() => onUpdateWeather({
              ...weather,
              seaState: 'Very Rough',
              seaStateTa: 'மிகவும் கொந்தளிப்பான கடல்',
              waveHeightM: 3.5,
              windKnots: 42,
              gustKnots: 55,
              cycloneStatus: 'DANGER_RED',
              cycloneTitleEn: 'Severe Cyclone Alert: All Fishermen Must Return to Shore Immediately',
              cycloneTitleTa: 'தீவிர புயல் எச்சரிக்கை: மீனவர்கள் அனைவரும் உடனடியாக கரை திரும்பவும்',
              advisoryEn: 'Squally winds 75-85 kmph gusting to 95 kmph. High danger. Immediate harbor return required.',
              advisoryTa: 'மணிக்கு 85 கி.மீ வேகத்தில் சுழன்றடிக்கும் சூறாவளி காற்று. உடனடியாக அருகிலுள்ள துறைமுகத்திற்கு திரும்புங்கள்.',
            })}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
          >
            🔴 Red Cyclone Warning
          </button>
        </div>
      </div>
    </div>
  );
};
