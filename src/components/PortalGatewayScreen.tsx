import React, { useState } from 'react';
import { BoatState } from '../types/marine';
import { 
  Ship, 
  Anchor, 
  Users, 
  MapPin, 
  KeyRound, 
  Building2, 
  Lock, 
  Compass, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Phone,
  CheckCircle2,
  FilePlus2,
  LogIn,
  Mail,
  Database,
  Loader2
} from 'lucide-react';

interface PortalGatewayScreenProps {
  currentBoat: BoatState;
  onFishermanLogin: (details: {
    name: string;
    regNumber: string;
    skipperName: string;
    crewCount: number;
    homePort: string;
  }) => void;
  onRegisterNewBoat: (newBoat: {
    name: string;
    regNumber: string;
    type: string;
    skipperName: string;
    crewCount: number;
    homePort: string;
    emergencyPhone?: string;
  }) => void;
  onOpenAdminLogin: () => void;
}

export const PortalGatewayScreen: React.FC<PortalGatewayScreenProps> = ({
  currentBoat,
  onFishermanLogin,
  onRegisterNewBoat,
  onOpenAdminLogin,
}) => {
  // Mode: LOGIN (existing voyage login) or REGISTER (new boat registration)
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Existing Login form state
  const [boatName, setBoatName] = useState(currentBoat.name || 'Annai Velankanni (அன்னை வேளாங்கண்ணி)');
  const [regNumber, setRegNumber] = useState(currentBoat.regNumber || 'IND-TN-10-MM-4492');
  const [skipperName, setSkipperName] = useState(currentBoat.skipperName || 'Anthony Raj (அந்தோணி ராஜ்)');
  const [crewCount, setCrewCount] = useState(currentBoat.crewCount || 5);
  const [homePort, setHomePort] = useState(currentBoat.homePort || 'Rameswaram Fishing Jetty');
  const [password, setPassword] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');

  // New Boat Registration form state
  const [newBoatName, setNewBoatName] = useState('');
  const [newRegNumber, setNewRegNumber] = useState(`IND-TN-10-MM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newBoatType, setNewBoatType] = useState('Mechanized Trawler (விசைப்படகு)');
  const [newSkipperName, setNewSkipperName] = useState('');
  const [newCrewCount, setNewCrewCount] = useState(6);
  const [newHomePort, setNewHomePort] = useState('Rameswaram Fishing Jetty');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('+91 94431-29182');
  const [newEmail, setNewEmail] = useState('');
  const [newPin, setNewPin] = useState('1234');
  const [safetyCheckConfirmed, setSafetyCheckConfirmed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendSuccessMsg, setBackendSuccessMsg] = useState('');

  // Handle Existing Boat Voyage Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boatName.trim()) {
      setErrorMsg('Please enter boat name (படகு பெயரை உள்ளிடவும்)');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter voyage password / PIN (கடவுச்சொல் உள்ளிடவும்)');
      return;
    }

    onFishermanLogin({
      name: boatName.trim(),
      regNumber: regNumber.trim() || 'IND-TN-10-MM-4492',
      skipperName: skipperName.trim() || 'Skipper',
      crewCount: Math.max(1, crewCount),
      homePort: homePort.trim(),
    });
  };

  // Handle New Boat & User Registration (automatically syncs with MySQL backend /api/signup)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoatName.trim()) {
      setErrorMsg('Please enter the new boat name (புதிய படகு பெயரை உள்ளிடவும்)');
      return;
    }
    if (!newSkipperName.trim()) {
      setErrorMsg('Please enter the skipper / captain name (சுக்கான் பெயரை உள்ளிடவும்)');
      return;
    }
    if (!newPin.trim()) {
      setErrorMsg('Please create a security PIN / password (கடவுச்சொல் அமைக்கவும்)');
      return;
    }

    const emailToSubmit = newEmail.trim() || `${newSkipperName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'fisherman' + Math.floor(100 + Math.random() * 900)}@palkbay.in`;

    setIsSubmitting(true);
    setErrorMsg('');
    setBackendSuccessMsg('');

    try {
      // Automatic backend signup request via POST /api/signup
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSkipperName.trim(),
          email: emailToSubmit,
          password: newPin.trim(),
          boatName: newBoatName.trim(),
          crewCount: Math.max(1, newCrewCount),
          homePort: newHomePort.trim(),
          regNumber: newRegNumber.trim() || `IND-TN-10-MM-${Math.floor(1000 + Math.random() * 9000)}`,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Registration failed');
      }

      setBackendSuccessMsg(resData.message || 'User registered automatically in database!');

      // Complete registration in application state
      setTimeout(() => {
        onRegisterNewBoat({
          name: newBoatName.trim(),
          regNumber: newRegNumber.trim() || `IND-TN-10-MM-${Math.floor(1000 + Math.random() * 9000)}`,
          type: newBoatType,
          skipperName: newSkipperName.trim(),
          crewCount: Math.max(1, newCrewCount),
          homePort: newHomePort.trim(),
          emergencyPhone: newEmergencyPhone.trim(),
        });
      }, 700);

    } catch (err: any) {
      console.warn('Backend signup notice (fallback to local state):', err.message);
      // If server or network notice, still proceed smoothly
      onRegisterNewBoat({
        name: newBoatName.trim(),
        regNumber: newRegNumber.trim() || `IND-TN-10-MM-${Math.floor(1000 + Math.random() * 9000)}`,
        type: newBoatType,
        skipperName: newSkipperName.trim(),
        crewCount: Math.max(1, newCrewCount),
        homePort: newHomePort.trim(),
        emergencyPhone: newEmergencyPhone.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPreset = (preset: { name: string; reg: string; port: string; crew: number }) => {
    setBoatName(preset.name);
    setRegNumber(preset.reg);
    setHomePort(preset.port);
    setCrewCount(preset.crew);
    setErrorMsg('');
  };

  const generateNewRegId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setNewRegNumber(`IND-TN-10-MM-${randomNum}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 bg-grid-tactical">
      <div className="w-full max-w-xl flex flex-col gap-5 my-auto">
        {/* Top Branding */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-800 border-2 border-cyan-400/60 flex items-center justify-center text-white shadow-2xl shadow-cyan-950">
            <Compass className="w-8 h-8 text-cyan-200" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                SEA GUARDIAN
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/40 uppercase">
                BlueShield AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Smart Marine Boundary Alert & Fisherman Safety System • <span className="font-tamil text-cyan-400">கடல் எல்லை பாதுகாப்பு</span>
            </p>
          </div>
        </div>

        {/* Card 1: Fisherman Portal (Toggle between Voyage Login & Register New Boat) */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md flex flex-col gap-4">
          {/* Header & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/90 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {authMode === 'LOGIN' ? 'Fisherman Voyage Login' : 'Register New Boat'}
                </h2>
                <p className="text-xs font-tamil text-cyan-300">
                  {authMode === 'LOGIN' ? 'மீனவர் படகு & பயண பதிவு' : 'புதிய படகு பதிவு (New Vessel Registration)'}
                </p>
              </div>
            </div>

            {/* Segmented Auth Mode Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => { setAuthMode('LOGIN'); setErrorMsg(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  authMode === 'LOGIN'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Voyage Login</span>
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('REGISTER'); setErrorMsg(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  authMode === 'REGISTER'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Register New Boat</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* MODE A: EXISTING BOAT VOYAGE LOGIN */}
          {authMode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
              {/* Quick Harbor Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Harbor Presets (துறைமுக படகுகள்):
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
                    className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer"
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
                    className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer"
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
                    className="p-2 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-white text-[11px] truncate">Pamban</div>
                    <div className="text-[10px] text-cyan-400">6 Crew • IND-TN-06</div>
                  </button>
                </div>
              </div>

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
                  placeholder="Annai Velankanni"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              {/* Reg ID & Skipper */}
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

              {/* Crew count & Port */}
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
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 text-center font-mono-num font-bold text-cyan-400 text-sm">
                      {crewCount} Members
                    </div>
                    <button
                      type="button"
                      onClick={() => setCrewCount(c => Math.min(16, c + 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm cursor-pointer"
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

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  Voyage Password / PIN (கடவுச்சொல்)
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
                  Default PIN: <code className="text-cyan-400">1234</code>
                </span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-950/80 border border-cyan-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 mt-1"
              >
                <span>Proceed to Boat Navigation & Alerts (பயணத்தை தொடங்கு)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MODE B: REGISTER NEW BOAT (புதிய படகு பதிவு) */}
          {authMode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Registering a new fishing boat configures an official Maritime Mobile Service Identity (MMSI) token and enrolls your crew into the Tamil Nadu coastal safety network.
                </p>
              </div>

              {/* New Boat Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                  <Ship className="w-3.5 h-3.5 text-emerald-400" />
                  New Boat Name (புதிய படகு பெயர்)
                </label>
                <input
                  type="text"
                  value={newBoatName}
                  onChange={(e) => setNewBoatName(e.target.value)}
                  placeholder="e.g. Muthu Mariamman (முத்து மாரியம்மன்)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              {/* Vessel Type & Registration ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Anchor className="w-3.5 h-3.5 text-emerald-400" />
                    Vessel Type (படகு வகை)
                  </label>
                  <select
                    value={newBoatType}
                    onChange={(e) => setNewBoatType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Mechanized Trawler (விசைப்படகு)">Mechanized Trawler (விசைப்படகு)</option>
                    <option value="Motorized FRP Boat (நாட்டுப்படகு)">Motorized FRP Boat (நாட்டுப்படகு)</option>
                    <option value="Deep Sea Gillnetter (ஆழ்கடல் படகு)">Deep Sea Gillnetter (ஆழ்கடல் படகு)</option>
                    <option value="Traditional Vallam (மர வள்ளம்)">Traditional Vallam (மர வள்ளம்)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      Registration ID (பதிவு எண்)
                    </label>
                    <button
                      type="button"
                      onClick={generateNewRegId}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate ID
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newRegNumber}
                    onChange={(e) => setNewRegNumber(e.target.value)}
                    placeholder="IND-TN-10-MM-XXXX"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono-num font-bold text-emerald-300"
                    required
                  />
                </div>
              </div>

              {/* Skipper Name & Crew Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Skipper / Owner Name (சுக்கான் பெயர்)
                  </label>
                  <input
                    type="text"
                    value={newSkipperName}
                    onChange={(e) => setNewSkipperName(e.target.value)}
                    placeholder="e.g. S. Murugesan (முருகேசன்)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Crew Members (மீனவர்கள் எண்ணிக்கை)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCrewCount(c => Math.max(1, c - 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 text-center font-mono-num font-bold text-emerald-400 text-sm">
                      {newCrewCount} Members
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewCrewCount(c => Math.min(20, c + 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Home Port & Shore Emergency Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Home Port Jetty (சொந்த துறைமுகம்)
                  </label>
                  <select
                    value={newHomePort}
                    onChange={(e) => setNewHomePort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Rameswaram Fishing Jetty">Rameswaram Fishing Jetty (ராமேஸ்வரம்)</option>
                    <option value="Mandapam South Jetty">Mandapam South Jetty (மண்டபம்)</option>
                    <option value="Pamban Lighthouse Pier">Pamban Light Pier (பாம்பன்)</option>
                    <option value="Dhanushkodi Harbor Base">Dhanushkodi Base (தனுஷ்கோடி)</option>
                    <option value="Kottaipattinam Deep Port">Kottaipattinam Port (கோட்டைப்பட்டினம்)</option>
                    <option value="Thondi Fishing Shore">Thondi Shore (தொண்டி)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Family Emergency Contact (குடும்ப அவசர எண்)
                  </label>
                  <input
                    type="text"
                    value={newEmergencyPhone}
                    onChange={(e) => setNewEmergencyPhone(e.target.value)}
                    placeholder="+91 94431-29182"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono-num"
                  />
                </div>
              </div>

              {/* Email Address & Security Password / PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    User Email (மின்னஞ்சல் முகவரி)
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="skipper@palkbay.in"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Used for database record & recovery
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    Create Password / PIN (கடவுச்சொல்)
                  </label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter password (min 4 chars)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono-num"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Encrypted with Bcrypt in MySQL
                  </span>
                </div>
              </div>

              {/* Safety Compliance Check */}
              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={safetyCheckConfirmed}
                  onChange={(e) => setSafetyCheckConfirmed(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span>Mandatory safety tokens, life-saving distress beacons & crew bio-cards verified</span>
              </label>

              {/* Backend Success Banner if completed */}
              {backendSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{backendSuccessMsg}</span>
                </div>
              )}

              {/* Register Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/80 border border-emerald-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 mt-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Database /api/signup...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Register New Boat & User (தானியங்கி பதிவு)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Card 2: Dedicated Fisheries Department & Coast Guard Portal (OUTSIDE the fisherman app, below login form!) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                FISHERIES DEPARTMENT & COAST GUARD PORTAL
              </h3>
              <p className="text-[11px] font-tamil text-slate-400 mt-0.5">
                அரசு மீன்வளத்துறை & கடலோர காவல்படை சிறப்பு கட்டுப்பாட்டு அறை (Secret Password Required)
              </p>
            </div>
          </div>

          <button
            onClick={onOpenAdminLogin}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-orange-950/70 border border-orange-400/50 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Lock className="w-4 h-4" />
            <span>Admin / Officer Login (ரகசிய உள்நுழைவு)</span>
          </button>
        </div>

        {/* Footer info note */}
        <div className="text-center text-[11px] text-slate-500">
          Indo-Sri Lanka Maritime Geofence • Coastal Radar 1554 • Mandapam Fisheries Station
        </div>
      </div>
    </div>
  );
};
