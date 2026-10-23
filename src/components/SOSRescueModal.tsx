import React, { useState, useEffect, useRef } from 'react';
import { BoatState, SOSDistress } from '../types/marine';
import { 
  Radio, 
  X, 
  AlertOctagon, 
  PhoneCall, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  Send, 
  Wrench, 
  CloudLightning, 
  HeartPulse, 
  Anchor, 
  LifeBuoy
} from 'lucide-react';
import { marineAudio } from '../utils/soundAndVoice';

interface SOSRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  boat: BoatState;
  activeSOS: SOSDistress | null;
  onTriggerSOS: (reason: SOSDistress['reason'], notes: string) => void;
  onResolveSOS: () => void;
}

export const SOSRescueModal: React.FC<SOSRescueModalProps> = ({
  isOpen,
  onClose,
  boat,
  activeSOS,
  onTriggerSOS,
  onResolveSOS,
}) => {
  const [selectedReason, setSelectedReason] = useState<SOSDistress['reason']>('ENGINE_FAILURE');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isHolding) {
      const startTime = Date.now();
      const holdDuration = 2500; // 2.5 seconds hold
      holdIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / holdDuration) * 100);
        setHoldProgress(progress);

        if (progress >= 100) {
          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
          setIsHolding(false);
          setHoldProgress(0);
          handleFireSOS();
        }
      }, 50);
    } else {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      setHoldProgress(0);
    }

    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, [isHolding]);

  if (!isOpen) return null;

  const handleFireSOS = () => {
    onTriggerSOS(selectedReason, additionalNotes);
    marineAudio.playSOSBeep();
    marineAudio.speakAlert(
      "அவசர உதவி சமிக்ஞை (SOS) கடலோர காவல்படை மற்றும் மீன்வளத்துறைக்கு அனுப்பப்பட்டது. மீட்பு படகு விரைந்து வருகிறது.",
      "Distress SOS broadcasted to Indian Coast Guard MRCC Chennai. Emergency responders notified.",
      'BREACH',
      true
    );
  };

  const distressTypes = [
    {
      id: 'ENGINE_FAILURE' as const,
      label: 'Engine Failure / Breakdown',
      labelTa: 'இயந்திர செயலிழப்பு',
      desc: 'Propeller seized or main engine dead, boat drifting',
      icon: Wrench,
      color: 'text-amber-400 border-amber-500/50 bg-amber-950/30',
    },
    {
      id: 'STORM_CYCLONE' as const,
      label: 'Severe Storm / Cyclone',
      labelTa: 'புயல் / கடும் கடல் கொந்தளிப்பு',
      desc: 'High waves swamping hull, anchor dragging',
      icon: CloudLightning,
      color: 'text-rose-400 border-rose-500/50 bg-rose-950/30',
    },
    {
      id: 'MEDICAL_EMERGENCY' as const,
      label: 'Crew Medical Emergency',
      labelTa: 'மருத்துவ அவசரநிலை',
      desc: 'Severe injury, cardiac event, or unconscious crew member',
      icon: HeartPulse,
      color: 'text-red-400 border-red-500/50 bg-red-950/30',
    },
    {
      id: 'VESSEL_FLOODING' as const,
      label: 'Hull Breach / Sinking Danger',
      labelTa: 'படகு மூழ்கும் அபாயம் / நீர் கசிவு',
      desc: 'Water ingress, bilge pump failure',
      icon: LifeBuoy,
      color: 'text-red-500 border-red-600/60 bg-red-950/40',
    },
    {
      id: 'FOREIGN_INTERCEPTION' as const,
      label: 'Foreign Navy / Coastal Warning',
      labelTa: 'எல்லை பாதுகாப்பு எச்சரிக்கை',
      desc: 'Apprehension or patrol vessel approaching',
      icon: AlertOctagon,
      color: 'text-amber-300 border-amber-400/50 bg-amber-950/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-red-600/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-red-950 to-slate-900 border-b border-red-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-lg animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                MARITIME DISTRESS SOS SYSTEM
              </h2>
              <p className="text-xs font-tamil text-red-200">
                கடல் அவசர உதவி மீட்பு அமைப்பு (MRCC Chennai & Coast Guard 1554)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Active SOS Status Card */}
          {activeSOS ? (
            <div className="p-4 rounded-xl bg-red-950/80 border border-red-500 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                  <span>DISTRESS BROADCAST ACTIVE (LIVE)</span>
                </div>
                <span className="text-xs font-mono-num bg-red-900/60 px-2 py-0.5 rounded text-red-200">
                  REF #{activeSOS.id}
                </span>
              </div>

              <div className="bg-slate-950/90 rounded-lg p-3 font-mono-num text-xs border border-red-900/50 space-y-1">
                <div className="text-white">
                  <strong>Vessel: </strong> {activeSOS.boatName} ({activeSOS.regNumber})
                </div>
                <div className="text-cyan-400">
                  <strong>GPS Coords: </strong> {activeSOS.lat.toFixed(4)}°N, {activeSOS.lng.toFixed(4)}°E
                </div>
                <div className="text-amber-400">
                  <strong>Reason: </strong> {activeSOS.reason.replace('_', ' ')}
                </div>
                <div className="text-slate-300">
                  <strong>Status: </strong> <span className="text-emerald-400 font-bold">{activeSOS.status}</span>
                </div>
              </div>

              {/* Multi-channel dispatch checklist */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between text-slate-300 bg-slate-900/70 p-2 rounded">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Indian Coast Guard MRCC Chennai (1554 / VHF Ch 16)
                  </span>
                  <span className="text-emerald-400 font-bold">ACKNOWLEDGED</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 bg-slate-900/70 p-2 rounded">
                  <span className="flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-cyan-400" />
                    Dept of Fisheries Mandapam Base Station
                  </span>
                  <span className="text-cyan-400 font-bold">INTERCEPTOR DISPATCHED</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 bg-slate-900/70 p-2 rounded">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Family Emergency Contact (+91 94431-XXXXX)
                  </span>
                  <span className="text-emerald-400 font-bold">SMS & MAP LINK SENT</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 bg-slate-900/70 p-2 rounded">
                  <span className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    SX1278 LoRa Mesh Boat-to-Boat Relay
                  </span>
                  <span className="text-amber-300 font-bold">HOPPING TO 3 NEARBY BOATS</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-red-900/60">
                <div className="text-xs text-slate-300">
                  Estimated Coast Guard Rescue Arrival:{' '}
                  <strong className="text-emerald-400 font-mono-num text-sm">
                    {activeSOS.etaMinutes} minutes
                  </strong>
                </div>
                <button
                  onClick={onResolveSOS}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all cursor-pointer"
                >
                  Mark SOS Resolved / Stand Down
                </button>
              </div>
            </div>
          ) : (
            /* SOS Creation View */
            <>
              {/* Emergency Situation Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Select Nature of Distress (துன்பத்தின் வகை):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {distressTypes.map((dt) => {
                    const Icon = dt.icon;
                    const isSelected = selectedReason === dt.id;
                    return (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => setSelectedReason(dt.id)}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-red-500 bg-red-950/60 shadow-md ring-1 ring-red-500'
                            : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${dt.color} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{dt.label}</div>
                          <div className="text-[11px] font-tamil text-amber-300">{dt.labelTa}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{dt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Boat Telemetry Snapshot to be Sent */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <div className="text-slate-400 font-semibold mb-2 flex items-center justify-between">
                  <span>Distress Packet Telemetry to be Broadcast:</span>
                  <span className="text-[10px] text-emerald-400">Encrypted LoRa / GSM</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-num text-[11px]">
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">VESSEL ID</span>
                    <span className="text-cyan-300 font-bold">{boat.regNumber}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">GPS LAT / LNG</span>
                    <span className="text-white font-bold">{boat.lat.toFixed(4)}°, {boat.lng.toFixed(4)}°</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">CREW COUNT</span>
                    <span className="text-white font-bold">{boat.crewCount} Persons</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded">
                    <span className="text-slate-500 block text-[9px]">BATTERY / FUEL</span>
                    <span className="text-emerald-400 font-bold">{boat.batteryVolts}V / {boat.fuelPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Hold to Activate Button (Safety Mechanism) */}
              <div className="pt-2 flex flex-col items-center">
                <p className="text-xs text-slate-400 mb-2 text-center">
                  Press and hold for 2.5 seconds to prevent accidental triggers on waves:
                </p>

                <div className="relative w-full max-w-sm">
                  <button
                    type="button"
                    onMouseDown={() => setIsHolding(true)}
                    onMouseUp={() => setIsHolding(false)}
                    onTouchStart={() => setIsHolding(true)}
                    onTouchEnd={() => setIsHolding(false)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-xl shadow-red-950/80 border-2 border-red-400 flex items-center justify-center gap-2 select-none active:scale-[0.98] transition-all cursor-pointer overflow-hidden relative"
                  >
                    {/* Fill Progress Bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-red-400/40 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                    <Radio className="w-5 h-5 relative z-10 animate-pulse" />
                    <span className="relative z-10">
                      {isHolding ? `HOLDING... ${Math.round(holdProgress)}%` : 'HOLD TO BROADCAST SOS (அவசர உதவி)'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
            <span>Emergency Toll-Free: <strong>Coast Guard 1554</strong> | Police 1093</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
