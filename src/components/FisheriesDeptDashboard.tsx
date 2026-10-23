import React, { useState } from 'react';
import { BoatState, AlertState, SOSDistress } from '../types/marine';
import { 
  Building2, 
  Anchor, 
  Radio, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Search, 
  Users, 
  Cpu, 
  Wifi, 
  ShieldAlert, 
  Layers,
  MapPin,
  Ship,
  Phone,
  Clock,
  Sparkles,
  HardDrive,
  Database
} from 'lucide-react';
import { evaluateBoatAlert, calculateHaversineDistance } from '../utils/marineCalculations';
import { IMBL_COORDINATES } from '../data/imblData';
import { HardwareTelemetryInspector } from './HardwareTelemetryInspector';
import { OfflineTrackingView } from './OfflineTrackingView';
import { DatabaseInspectorView } from './DatabaseInspectorView';

interface FisheriesDeptDashboardProps {
  primaryBoat: BoatState;
  fleetBoats: BoatState[];
  alert: AlertState;
  activeSOS: SOSDistress | null;
  onSendFleetBroadcast: (message: string) => void;
  onOpenDatabaseModal?: () => void;
}

type AdminTab = 'FLEET' | 'VOYAGE_LOGS' | 'DATABASE_EXPLORER' | 'LORA_HARDWARE' | 'TREATY_BOUNDARY' | 'BROADCAST' | 'REGISTRY';

export const FisheriesDeptDashboard: React.FC<FisheriesDeptDashboardProps> = ({
  primaryBoat,
  fleetBoats,
  alert,
  activeSOS,
  onSendFleetBroadcast,
  onOpenDatabaseModal,
}) => {
  const [adminTab, setAdminTab] = useState<AdminTab>('FLEET');
  const [searchTerm, setSearchTerm] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [selectedInspectBoat, setSelectedInspectBoat] = useState<BoatState>(primaryBoat);

  // Combine primary boat + fleet boats
  const allVessels = [primaryBoat, ...fleetBoats];

  const filteredVessels = allVessels.filter(
    v => v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         v.regNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
         v.homePort.toLowerCase().includes(searchTerm.toLowerCase()) ||
         v.skipperName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    onSendFleetBroadcast(broadcastInput);
    setBroadcastSent(true);
    setBroadcastInput('');
    setTimeout(() => setBroadcastSent(false), 3500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-extrabold uppercase tracking-wider border border-amber-700">
                  GOVERNMENT OF TAMIL NADU
                </span>
                <span className="text-xs text-slate-400">
                  Fisheries Department & Fishermen Welfare • Mandapam Regional Control Center
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                Palk Bay Maritime Fleet Surveillance & IMBL Enforcement Console
              </h3>
              <p className="text-xs font-tamil text-slate-400">
                மீன்வளத்துறை மற்றும் இந்திய கடலோர காவல்படை ஒருங்கிணைந்த நிர்வாக போர்டல்
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px]">Tracked Vessels</span>
              <span className="font-mono-num font-bold text-white text-sm">{allVessels.length} Trawlers</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px]">LoRa Gateway Node</span>
              <span className="font-bold text-emerald-400 text-sm">868 MHz Online</span>
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setAdminTab('FLEET')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'FLEET'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Anchor className="w-4 h-4" />
            <span>Fleet Surveillance (படகு கண்காணிப்பு)</span>
          </button>

          <button
            onClick={() => setAdminTab('VOYAGE_LOGS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'VOYAGE_LOGS'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Store & Forward Voyage Logs (பயண வரலாறு)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
              OFFLINE SYNC
            </span>
          </button>

          <button
            onClick={() => setAdminTab('DATABASE_EXPLORER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'DATABASE_EXPLORER'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Database Tables Inspector (டேட்டாபேஸ் பார்வை)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700 font-mono">
              LIVE SQL
            </span>
          </button>

          <button
            onClick={() => setAdminTab('LORA_HARDWARE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'LORA_HARDWARE'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>LoRa & Telemetry Hardware (LoRa சாதனங்கள்)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700">
              OFFICER ONLY
            </span>
          </button>

          <button
            onClick={() => setAdminTab('TREATY_BOUNDARY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'TREATY_BOUNDARY'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>1974 Treaty Boundary (எல்லை நிலைகள் 1-6)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/60 text-red-200 border border-red-700">
              OFFICIAL
            </span>
          </button>

          <button
            onClick={() => setAdminTab('BROADCAST')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'BROADCAST'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>LoRa Broadcast (எச்சரிக்கை ஒலிபரப்பு)</span>
          </button>

          <button
            onClick={() => setAdminTab('REGISTRY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              adminTab === 'REGISTRY'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-950 border border-amber-400/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Boats & Crew (பதிவு விவரம்)</span>
          </button>
        </div>
      </div>

      {/* PostgreSQL Database Status & Explorer Card (Admin Console) */}
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-950/90 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950">
            <Database className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-white">
                PostgreSQL Database: <span className="text-cyan-400 font-mono font-bold">marineproject</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                13 Tables Connected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              users, boats, devices, boat_locations, boundaries, sos_events • SQL Query Console
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenDatabaseModal) {
              onOpenDatabaseModal();
            } else {
              setAdminTab('DATABASE_EXPLORER');
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0 shadow-md shadow-cyan-950/60"
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Open Database Manager (தரவுத்தளம்)</span>
        </button>
      </div>

      {/* Distress Alert Banner if active */}
      {activeSOS && (
        <div className="p-4 rounded-xl bg-red-950/80 border-2 border-red-500 animate-pulse flex items-center justify-between gap-3 shadow-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                ACTIVE SOS DISTRESS INCIDENT: {activeSOS.boatName} ({activeSOS.regNumber})
              </h4>
              <p className="text-xs text-red-200">
                GPS: {activeSOS.lat.toFixed(4)}°N, {activeSOS.lng.toFixed(4)}°E • Reason: {activeSOS.reason.replace('_', ' ')} • Indian Coast Guard Dispatched
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded bg-red-600 text-white font-mono-num font-bold text-xs uppercase">
            STATUS: {activeSOS.status}
          </span>
        </div>
      )}

      {/* TAB 1: FLEET MONITORING TABLE */}
      {adminTab === 'FLEET' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Registered Fishing Vessels in Sector</h4>
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vessel or reg #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Fleet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Vessel & Registration</th>
                  <th className="py-2.5 px-3">Port & Skipper</th>
                  <th className="py-2.5 px-3">Crew Count</th>
                  <th className="py-2.5 px-3">GPS Location</th>
                  <th className="py-2.5 px-3">SOG / COG</th>
                  <th className="py-2.5 px-3">Distance to IMBL</th>
                  <th className="py-2.5 px-3">Boundary Status</th>
                  <th className="py-2.5 px-3">LoRa Signal</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-num">
                {filteredVessels.map((v) => {
                  const alertCheck = evaluateBoatAlert({ lat: v.lat, lng: v.lng });
                  return (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white font-sans flex items-center gap-1.5">
                          <span>{v.name}</span>
                          {v.id === primaryBoat.id && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              Active App
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-cyan-400 font-mono-num">{v.regNumber}</div>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <div className="text-slate-300">{v.homePort}</div>
                        <div className="text-[11px] text-slate-500">{v.skipperName}</div>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 text-xs font-bold">
                          {v.crewCount} Crew
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div>{v.lat.toFixed(4)}°N</div>
                        <div>{v.lng.toFixed(4)}°E</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div className="font-bold text-white">{v.sog.toFixed(1)} kts</div>
                        <div className="text-[11px] text-slate-400">{v.cog}° COG</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${
                          alertCheck.level === 'BREACH' ? 'text-rose-400' :
                          alertCheck.level === 'RED' ? 'text-red-400' :
                          alertCheck.level === 'ORANGE' ? 'text-amber-400' :
                          alertCheck.level === 'YELLOW' ? 'text-yellow-300' : 'text-emerald-400'
                        }`}>
                          {(alertCheck.distanceMeters / 1000).toFixed(2)} km
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase ${
                          alertCheck.level === 'BREACH' ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse' :
                          alertCheck.level === 'RED' ? 'bg-red-950 text-red-300 border border-red-600' :
                          alertCheck.level === 'ORANGE' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
                          alertCheck.level === 'YELLOW' ? 'bg-yellow-950 text-yellow-300 border border-yellow-600' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}>
                          {alertCheck.level}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-cyan-300">
                          <Wifi className="w-3 h-3" />
                          <span>{v.loraSignalRssi} dBm</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => {
                            setSelectedInspectBoat(v);
                            setAdminTab('LORA_HARDWARE');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Inspect LoRa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LORA TELEMETRY & HARDWARE INSPECTOR (Dedicated to Admin Portal) */}
      {adminTab === 'LORA_HARDWARE' && (
        <div className="flex flex-col gap-4">
          {/* Vessel Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Selected Vessel for Hardware Diagnostics:</span>
              <span className="text-xs font-semibold text-cyan-300 font-mono-num bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {selectedInspectBoat.name} ({selectedInspectBoat.regNumber})
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">Switch Target:</span>
              {allVessels.map((bv) => (
                <button
                  key={bv.id}
                  onClick={() => setSelectedInspectBoat(bv)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedInspectBoat.id === bv.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {bv.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Embedded Hardware Telemetry Inspector */}
          <HardwareTelemetryInspector
            boat={selectedInspectBoat}
            alert={evaluateBoatAlert({ lat: selectedInspectBoat.lat, lng: selectedInspectBoat.lng })}
          />
        </div>
      )}

      {/* TAB 3: BROADCAST MESSAGE TO ALL VESSELS */}
      {adminTab === 'BROADCAST' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-base font-bold text-white">Broadcast Alert to All Fishing Vessels</h4>
              <p className="text-xs font-tamil text-slate-400">
                அனைத்து படகுகளுக்கும் LoRa & Navtex வானொலி அவசர அறிவிப்பு அனுப்புதல்
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
            Transmits high-priority coastal warning messages directly over the 868 MHz LoRa mesh network and Navtex receiver. All onboard ESP32 units will emit an audible chime and display the text notice on the fisherman&apos;s navigation screen.
          </div>

          {/* Preset Emergency Broadcasts */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Warning Templates:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBroadcastInput('URGENT: Sri Lankan Navy patrol sighted 1.2 NM east of IMBL. All Indian mechanized trawlers advise steering west into Indian territorial waters.')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer text-slate-300"
              >
                🚨 IMBL Patrol Advisory (எல்லை ரோந்து எச்சரிக்கை)
              </button>
              <button
                type="button"
                onClick={() => setBroadcastInput('CYCLONE ADVISORY: IMD warning for Palk Bay. Wind gusts exceeding 45 knots expected. Return immediately to Rameswaram or Mandapam harbors.')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors cursor-pointer text-slate-300"
              >
                🌪️ Cyclone & Gale Warning (புயல் எச்சரிக்கை)
              </button>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              placeholder="Enter official departmental broadcast message to fleet..."
              value={broadcastInput}
              onChange={(e) => setBroadcastInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-lg shadow-amber-950"
            >
              <Send className="w-4 h-4" />
              <span>Send Fleet Transmission</span>
            </button>
          </form>

          {broadcastSent && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-xs text-emerald-300 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Official broadcast transmitted across 868 MHz LoRa Gateway to {allVessels.length} registered vessels!</span>
            </div>
          )}
        </div>
      )}

      {/* TAB: 1974 TREATY BOUNDARY POSITIONS 1 TO 6 */}
      {adminTab === 'TREATY_BOUNDARY' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h4 className="text-base font-bold text-white">
                  Historic 1974 Indo-Sri Lanka Maritime Boundary (IMBL Positions 1 to 6)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Agreement on the Boundary in Historic Waters between India and Sri Lanka (June 1974) • Article 1 Geodetic Great Circle Arcs
              </p>
              <p className="text-xs font-tamil text-amber-300/90 mt-0.5">
                இந்திய - இலங்கை வரலாற்று எல்லை ஒப்பந்தம் (1974): பாக் ஜலசந்தி மற்றும் பாக் விரிகுடாவில் அதிகாரப்பூர்வ சர்வதேச எல்லை நிலைகள்
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-800/80 text-xs self-start md:self-auto">
              <span className="text-red-300 font-bold block text-[10px]">TREATY STATUS</span>
              <span className="text-white font-mono-num font-bold">6 Defined Geodetic Points</span>
            </div>
          </div>

          {/* Quick Summary Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-cyan-400">Current Primary Vessel: </span>
              <span className="text-white font-semibold">{primaryBoat.name}</span>
              <span className="text-slate-400 ml-2 font-mono-num">
                (GPS: {primaryBoat.lat.toFixed(4)}°N, {primaryBoat.lng.toFixed(4)}°E)
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono-num text-xs">
              <span className="text-slate-400">Distance to nearest border point:</span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                {(alert.distanceMeters / 1000).toFixed(2)} km
              </span>
            </div>
          </div>

          {/* Positions Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Point #</th>
                  <th className="py-3 px-3.5">Key Boundary Position (1974 Agreement)</th>
                  <th className="py-3 px-3.5">Decimal Lat / Lng</th>
                  <th className="py-3 px-3.5">Maritime Sector & Description</th>
                  <th className="py-3 px-3.5 text-right">Distance from Vessel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {IMBL_COORDINATES.map((pt, idx) => {
                  const distMeters = calculateHaversineDistance(
                    { lat: primaryBoat.lat, lng: primaryBoat.lng },
                    { lat: pt.lat, lng: pt.lng }
                  );
                  return (
                    <tr key={pt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-bold font-mono-num text-white">
                        <span className="w-6 h-6 rounded-full bg-red-950 border border-red-700 text-red-200 inline-flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-amber-300 font-mono text-sm">
                          {pt.dmsNotation || pt.name}
                        </div>
                        <div className="text-[11px] font-tamil text-slate-400 mt-0.5">
                          {pt.nameTa}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-cyan-300 text-xs">
                        <div>{pt.lat.toFixed(6)}° N</div>
                        <div>{pt.lng.toFixed(6)}° E</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">
                        {idx === 0 && <span className="text-sky-300">Palk Strait North-East Entrance</span>}
                        {idx === 1 && <span className="text-sky-300">Palk Strait Central Shoal</span>}
                        {idx === 2 && <span className="text-sky-300">Palk Bay North-West Outer Sector</span>}
                        {idx === 3 && <span className="text-amber-300 font-semibold">North of Katchatheevu Island</span>}
                        {idx === 4 && <span className="text-sky-300">Palk Bay South / Dhanushkodi East</span>}
                        {idx === 5 && <span className="text-sky-300">Adam's Bridge Shoals / Talaimannar Channel</span>}
                        <div className="text-[10px] text-slate-500 mt-0.5">Article 1 Great Circle Anchor Point</div>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono-num">
                        <span className="font-bold text-white">{(distMeters / 1000).toFixed(2)} km</span>
                        <span className="text-slate-500 block text-[10px]">
                          ({(distMeters / 1852).toFixed(2)} NM)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legal Note on 1974 Boundary */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
            <strong className="text-slate-200 block text-xs">
              📜 Bilateral Historical Context (இருதரப்பு வரலாற்று பின்னணி):
            </strong>
            <p>
              Under the 1974 Agreement on Historic Waters, the boundary between India and Sri Lanka in the waters from Palk Strait to Adam's Bridge is demarcated by great circle arcs connecting Positions 1 through 6. All Indian fishermen sailing from Rameswaram, Mandapam, or Kottaipattinam must maintain safe clearance west of these 6 geodetic positions.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: REGISTERED BOATS & CREW REGISTRY */}
      {adminTab === 'REGISTRY' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Registered Vessels & Crew Manifest Directory</h4>
            </div>
            <span className="text-xs text-slate-400 font-mono-num">
              {allVessels.length} Registered Boats Enrolled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allVessels.map((bv) => (
              <div
                key={bv.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Ship className="w-3.5 h-3.5 text-cyan-400" />
                      {bv.name}
                    </span>
                    <span className="text-[10px] font-mono-num px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {bv.regNumber}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{bv.homePort}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>Skipper: <strong className="text-slate-200">{bv.skipperName}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Shore Contact: <strong className="text-cyan-300 font-mono-num">+91 94431-29182</strong></span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-2 flex items-center justify-between text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                    {bv.crewCount} Crew Members Onboard
                  </span>
                  <span className="text-slate-500 font-mono-num">
                    GPS: {bv.lat.toFixed(3)}°N, {bv.lng.toFixed(3)}°E
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STORE & FORWARD VOYAGE LOGS & COMPLIANCE */}
      {adminTab === 'VOYAGE_LOGS' && (
        <div className="flex flex-col gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  கரைக்கு திரும்பிய படகுகளின் வரலாற்றுப் பதிவு (Vessel Past Voyage Tracking)
                </h4>
              </div>
              <p className="text-xs text-slate-400 font-tamil mt-0.5">
                கடலில் ஆஃப்லைனில் பதிவாகி, கரைக்கு திரும்பியவுடன் கிளவுடுக்கு வந்த ஜிஎன்எஸ்எஸ் தரவுகள்.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">தேர்வு செய்த படகு:</span>
              <select
                value={selectedInspectBoat.id}
                onChange={(e) => {
                  const found = allVessels.find((v) => v.id === e.target.value);
                  if (found) setSelectedInspectBoat(found);
                }}
                className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 font-mono"
              >
                {allVessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.regNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <OfflineTrackingView boat={selectedInspectBoat} />
        </div>
      )}

      {/* TAB 6: DATABASE INSPECTOR & TABLES EXPLORER */}
      {adminTab === 'DATABASE_EXPLORER' && (
        <DatabaseInspectorView />
      )}
    </div>
  );
};
