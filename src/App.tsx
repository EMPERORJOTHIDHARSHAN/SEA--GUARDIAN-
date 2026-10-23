/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BoatState, 
  AlertState, 
  SOSDistress, 
  WeatherData, 
  PotentialFishingZone 
} from './types/marine';
import { 
  INITIAL_PRIMARY_BOAT, 
  FLEET_BOATS, 
  INITIAL_WEATHER, 
  SAMPLE_PFZ_ZONES 
} from './data/imblData';
import { 
  evaluateBoatAlert, 
  projectCoordinate,
  validateOceanPosition
} from './utils/marineCalculations';
import { marineAudio } from './utils/soundAndVoice';

// Components
import { PortalGatewayScreen } from './components/PortalGatewayScreen';
import { NavigationHUD } from './components/NavigationHUD';
import { MarineMap } from './components/MarineMap';
import { Ocean3DSurface } from './components/Ocean3DSurface';
import { TacticalVectorChart } from './components/TacticalVectorChart';
import { MarineTelemetryGraphs } from './components/MarineTelemetryGraphs';
import { BoatControls } from './components/BoatControls';
import { BoundaryAlertDetailView } from './components/BoundaryAlertDetailView';
import { WeatherAlertView } from './components/WeatherAlertView';
import { SOSRescueModal } from './components/SOSRescueModal';
import { FishingZonesView } from './components/FishingZonesView';
import { FamilyTrackingView } from './components/FamilyTrackingView';
import { FisheriesDeptDashboard } from './components/FisheriesDeptDashboard';
import { DeptOfficerLoginModal } from './components/DeptOfficerLoginModal';
import { NearbyVesselsRadar } from './components/NearbyVesselsRadar';
import { OfflineTrackingView } from './components/OfflineTrackingView';
import { offlineSyncEngine, SyncEngineStatus } from './utils/offlineSyncEngine';
import { MarineDatabaseModal } from './components/MarineDatabaseModal';

// Icons
import { 
  Compass, 
  CloudRain, 
  Radio, 
  Fish, 
  Users, 
  Building2, 
  Cpu, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  SlidersHorizontal, 
  Bell, 
  X, 
  Volume1, 
  ArrowLeft,
  LogOut,
  Ship,
  HardDrive,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';

// Main Fisherman Mobile Tabs (Simplified & Easy to Use)
type ActiveTab = 'HELM' | 'ALERTS' | 'WEATHER' | 'PFZ' | 'FAMILY' | 'OFFLINE';
type ChartViewMode = 'VECTOR_CHART' | 'OSM_MAP' | '3D_OCEAN' | 'SONAR_GRAPHS';
type SessionMode = 'GATEWAY' | 'FISHERMAN' | 'ADMIN';

export default function App() {
  // Session Mode: GATEWAY (Initial login screen with Fisherman on top & Admin below) | FISHERMAN | ADMIN
  const [sessionMode, setSessionMode] = useState<SessionMode>('GATEWAY');

  // Fisherman Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('HELM');
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('VECTOR_CHART');

  // Boat state & Telemetry
  const [boat, setBoat] = useState<BoatState>(INITIAL_PRIMARY_BOAT);
  const [fleetBoats, setFleetBoats] = useState<BoatState[]>(FLEET_BOATS);
  const [weather, setWeather] = useState<WeatherData>(INITIAL_WEATHER);
  const [pfzZones] = useState<PotentialFishingZone[]>(SAMPLE_PFZ_ZONES);
  const [wakeHistory, setWakeHistory] = useState<[number, number][]>([
    [INITIAL_PRIMARY_BOAT.lat, INITIAL_PRIMARY_BOAT.lng],
  ]);

  // Department Officer / Admin State
  const [isDeptLoginModalOpen, setIsDeptLoginModalOpen] = useState(false);
  const [deptOfficerName, setDeptOfficerName] = useState<string | null>(null);

  // Alert State
  const [alert, setAlert] = useState<AlertState>(() =>
    evaluateBoatAlert({ lat: INITIAL_PRIMARY_BOAT.lat, lng: INITIAL_PRIMARY_BOAT.lng })
  );

  // Audio & Voice Preferences
  const [isMuted, setIsMuted] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'ta' | 'en' | 'both'>('both');

  // Simulation State
  const [isSimulating, setIsSimulating] = useState(true);
  const [isRealGpsMode, setIsRealGpsMode] = useState(false);
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);

  // Map Filter Layers
  const [showPfz, setShowPfz] = useState(true);
  const [showFleet, setShowFleet] = useState(true);
  const [showBuffers, setShowBuffers] = useState(true);

  // SOS Emergency Distress State
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [activeSOS, setActiveSOS] = useState<SOSDistress | null>(null);

  // PostgreSQL Database Explorer Modal State (13 Tables)
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // Offline Store & Forward Engine State
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>({
    isSimulatedOffline: offlineSyncEngine.getSimulatedOffline(),
    effectiveOnline: offlineSyncEngine.isOnline(),
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    totalCount: 0,
  });

  useEffect(() => {
    const unsub = offlineSyncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keep Audio Manager settings synchronized
  useEffect(() => {
    marineAudio.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    marineAudio.setPreferredLanguage(voiceLang);
  }, [voiceLang]);

  // Recalculate Alert on boat position change and update audio/buzzer & voice alerts
  const previousAlertLevelRef = useRef<AlertState['level']>(alert.level);

  useEffect(() => {
    const currentAlert = evaluateBoatAlert({ lat: boat.lat, lng: boat.lng });
    setAlert(currentAlert);

    // Update hardware buzzer oscillator frequency/pattern
    marineAudio.updateBuzzer(currentAlert.level);

    // Speak alert if level escalated or breached
    if (
      currentAlert.level !== 'SAFE' &&
      currentAlert.level !== previousAlertLevelRef.current
    ) {
      marineAudio.speakAlert(
        currentAlert.messageTa,
        currentAlert.messageEn,
        currentAlert.level
      );
    }
    previousAlertLevelRef.current = currentAlert.level;
  }, [boat.lat, boat.lng]);

  // Real-time Motion Simulation Engine
  useEffect(() => {
    if (!isSimulating || isRealGpsMode) return;

    const interval = window.setInterval(() => {
      // Advance primary vessel
      setBoat((prev) => {
        const speedMultiplier = 3.0;
        const distMeters = prev.sog * 0.514444 * speedMultiplier;
        let currentHeading = prev.cog;

        const rawNewCoord = projectCoordinate(
          { lat: prev.lat, lng: prev.lng },
          currentHeading,
          distMeters
        );

        const waterCheck = validateOceanPosition(rawNewCoord.lat, rawNewCoord.lng);
        let finalLat = rawNewCoord.lat;
        let finalLng = rawNewCoord.lng;

        if (!waterCheck.isValidWater) {
          currentHeading = (currentHeading + 140) % 360;
          finalLat = waterCheck.lat;
          finalLng = waterCheck.lng;
        }

        setWakeHistory((history) => {
          const updated = [...history, [finalLat, finalLng] as [number, number]];
          return updated.slice(-120);
        });

        return {
          ...prev,
          lat: finalLat,
          lng: finalLng,
          cog: currentHeading,
          lastUpdated: new Date().toLocaleTimeString(),
        };
      });

      // Gently advance nearby fleet vessels so they realistically sail across the map
      setFleetBoats((prevFleet) =>
        prevFleet.map((fb) => {
          const fbDist = fb.sog * 0.514444 * 1.5;
          const nextCoord = projectCoordinate({ lat: fb.lat, lng: fb.lng }, fb.cog, fbDist);
          const waterCheck = validateOceanPosition(nextCoord.lat, nextCoord.lng);
          return {
            ...fb,
            lat: waterCheck.lat,
            lng: waterCheck.lng,
            lastUpdated: 'Live',
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, isRealGpsMode]);

  // Real GPS Device Mode
  useEffect(() => {
    if (!isRealGpsMode) return;

    if (!('geolocation' in navigator)) {
      showToast('Geolocation API not supported by browser.');
      setIsRealGpsMode(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        const waterCheck = validateOceanPosition(latitude, longitude);

        if (!waterCheck.isValidWater) {
          showToast(`⚠️ Device GPS located on land (${waterCheck.reason}). Snapping vessel to nearest coastal ocean waters!`);
        }

        setBoat((prev) => ({
          ...prev,
          lat: waterCheck.lat,
          lng: waterCheck.lng,
          sog: speed ? speed * 1.94384 : prev.sog,
          cog: heading ? Math.round(heading) : prev.cog,
          satelliteCount: 16,
          hdop: 0.6,
          lastUpdated: new Date().toLocaleTimeString(),
        }));
      },
      (err) => {
        console.warn('GPS error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isRealGpsMode]);

  // Periodic Live Boat Telemetry Sync to marineproject.boat_current_locations & devices
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!boat || !boat.lat || !boat.lng) return;
      fetch('/api/marine-db/boat-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boatId: 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22',
          boatName: boat.name,
          deviceId: 'd111cc88-8b0a-3de7-aa5c-5aa8ac270333',
          latitude: boat.lat,
          longitude: boat.lng,
          speedMps: (boat.sog || 0) * 0.514444,
          courseDegrees: boat.cog || 0,
          headingDegrees: boat.cog || 0,
          source: isRealGpsMode ? 'PHONE_GPS' : 'ESP32_GPS',
          batteryLevel: boat.batteryVolts ? Math.min(100, Math.round(((boat.batteryVolts - 11.5) / 1.5) * 100)) : 85,
          alertStatus: alert.level,
          distanceMeters: alert.distanceMeters || 1200,
        }),
      }).catch((e) => {
        // Silently catch background sync notice
      });
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [boat.lat, boat.lng, boat.sog, boat.cog, alert.level, isRealGpsMode]);

  // Fisherman Voyage Login Handler from Gateway Screen
  const handleFishermanLoginFromGateway = (details: {
    name: string;
    regNumber: string;
    skipperName: string;
    crewCount: number;
    homePort: string;
  }) => {
    setBoat((prev) => ({
      ...prev,
      name: details.name,
      regNumber: details.regNumber,
      skipperName: details.skipperName,
      crewCount: details.crewCount,
      homePort: details.homePort,
    }));
    setSessionMode('FISHERMAN');
    showToast(`⚓ Welcome aboard ${details.name}! Voyage logged with ${details.crewCount} crew.`);
    marineAudio.speakAlert(
      `படகு ${details.name} பயண பதிவு வெற்றிகரமாக முடிந்தது. பாதுகாப்பான பயணம் அமையட்டும்.`,
      `Voyage confirmed for vessel ${details.name} with ${details.crewCount} crew members.`,
      'SAFE',
      true
    );
  };

  // New Boat Registration Handler from Gateway Screen
  const handleRegisterNewBoat = (newDetails: {
    name: string;
    regNumber: string;
    type: string;
    skipperName: string;
    crewCount: number;
    homePort: string;
    emergencyPhone?: string;
  }) => {
    const newBoatState: BoatState = {
      id: `boat-${Date.now()}`,
      name: newDetails.name,
      regNumber: newDetails.regNumber,
      type: newDetails.type,
      skipperName: newDetails.skipperName,
      crewCount: newDetails.crewCount,
      homePort: newDetails.homePort,
      lat: 9.2850, // Safe Indian territorial waters near Dhanushkodi / Rameswaram
      lng: 79.3650,
      sog: 6.0,
      cog: 75,
      batteryVolts: 12.8,
      fuelPercent: 90,
      gsmSignal: 3,
      loraSignalRssi: -72,
      satelliteCount: 14,
      hdop: 0.8,
      isEngineRunning: true,
      lastUpdated: 'Just now',
    };

    setBoat(newBoatState);
    setFleetBoats((prev) => [newBoatState, ...prev]);
    setSessionMode('FISHERMAN');
    showToast(`✅ New Boat Registered: ${newDetails.name} (${newDetails.regNumber}) with ${newDetails.crewCount} crew!`);
    marineAudio.speakAlert(
      `புதிய படகு ${newDetails.name} வெற்றிகரமாக பதிவு செய்யப்பட்டது. இந்திய கடல் எல்லை பாதுகாப்பு அமைப்பு தயார்.`,
      `New vessel ${newDetails.name} successfully registered with ${newDetails.crewCount} crew members. Sea Guardian active.`,
      'SAFE',
      true
    );
  };

  // Department Officer Login Handler (Secret Password Verified)
  const handleDeptOfficerLoginSuccess = (officer: string) => {
    setDeptOfficerName(officer);
    setSessionMode('ADMIN');
    showToast(`👮 Admin Session Authorized: ${officer}`);
    marineAudio.speakAlert(
      "மீன்வளத்துறை கட்டுப்பாட்டு அறை திறக்கப்பட்டது.",
      "Fisheries Department surveillance dashboard authorized.",
      'SAFE',
      true
    );
  };

  // Steering & Presets Handlers
  const handleBoatPositionChange = useCallback((lat: number, lng: number) => {
    const waterCheck = validateOceanPosition(lat, lng);
    if (!waterCheck.isValidWater) {
      showToast(`⚠️ Cannot place boat on land (${waterCheck.reason}). Vessel locked to ocean waters!`);
    }

    setBoat((prev) => ({
      ...prev,
      lat: waterCheck.lat,
      lng: waterCheck.lng,
    }));
    setWakeHistory((prev) => [...prev, [waterCheck.lat, waterCheck.lng]]);
  }, []);

  const handleSpeedChange = (sog: number) => {
    setBoat((prev) => ({ ...prev, sog }));
  };

  const handleHeadingChange = (cog: number) => {
    setBoat((prev) => ({ ...prev, cog }));
  };

  // Presets for testing alert system escalations against 1974 Treaty Boundary
  const handleResetPosition = (presetKey?: string) => {
    if (presetKey === 'SAFE') {
      setBoat((prev) => ({
        ...prev,
        lat: 9.2850,
        lng: 79.3650,
        sog: 6.5,
        cog: 75,
      }));
      showToast('Position set: Safe Indian Waters (17 km from 1974 IMBL)');
    } else if (presetKey === 'YELLOW') {
      setBoat((prev) => ({
        ...prev,
        lat: 9.3000,
        lng: 79.5046,
        sog: 5.5,
        cog: 80,
      }));
      showToast('Position set: Yellow Alert Buffer (~1.8 km to 1974 IMBL)');
    } else if (presetKey === 'ORANGE') {
      setBoat((prev) => ({
        ...prev,
        lat: 9.3000,
        lng: 79.5133,
        sog: 5.0,
        cog: 85,
      }));
      showToast('Position set: Orange Alert Buffer (~850m to 1974 IMBL)');
    } else if (presetKey === 'RED') {
      setBoat((prev) => ({
        ...prev,
        lat: 9.3000,
        lng: 79.5175,
        sog: 4.5,
        cog: 88,
      }));
      showToast('Position set: Red Alert Critical Buffer (~380m to 1974 IMBL)');
    } else if (presetKey === 'BREACH') {
      setBoat((prev) => ({
        ...prev,
        lat: 9.3000,
        lng: 79.5285,
        sog: 5.5,
        cog: 90,
      }));
      showToast('🚨 Simulated Boundary Breach across 1974 Treaty Line into Sri Lankan Waters!');
    } else if (presetKey === 'DRIFT') {
      setBoat((prev) => ({
        ...prev,
        lat: 9.3000,
        lng: 79.5060,
        sog: 2.2,
        cog: 85,
        fuelPercent: 12,
        isEngineRunning: false,
      }));
      showToast('Simulated Engine Breakdown: Vessel drifting towards 1974 Treaty Line');
    }
  };

  // SOS Emergency Trigger
  const handleTriggerSOS = (reason: SOSDistress['reason'], notes: string) => {
    const newSOS: SOSDistress = {
      id: `SOS-IN-${Math.floor(1000 + Math.random() * 9000)}`,
      boatId: boat.id,
      boatName: boat.name,
      regNumber: boat.regNumber,
      lat: boat.lat,
      lng: boat.lng,
      timestamp: new Date().toLocaleTimeString(),
      reason,
      status: 'ACKNOWLEDGED_MRCC',
      responders: ['ICG Interceptor C-436', 'Fisheries Mandapam Fast Craft'],
      etaMinutes: 18,
      contactNumber: '+91 94431-29182',
      familyNotified: true,
      notes,
    };
    setActiveSOS(newSOS);
    showToast('🚨 DISTRESS SOS TRANSMITTED to Coast Guard MRCC Chennai & Family!');

    // Persist SOS Distress Event into PostgreSQL marineproject.sos_events and notifications
    fetch('/api/marine-db/sos-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boatId: 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22',
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        deviceId: 'd111cc88-8b0a-3de7-aa5c-5aa8ac270333',
        latitude: boat.lat,
        longitude: boat.lng,
        message: `${reason}: ${notes || 'Emergency distress beacon activated at sea'}`,
        triggerSource: 'ESP32_BUTTON',
      }),
    }).catch((e) => console.warn('SOS database sync notice:', e));
  };

  const handleResolveSOS = () => {
    setActiveSOS(null);
    showToast('✅ SOS Distress Ticket Resolved & Closed.');
  };

  // Nav target selection from PFZ
  const handleSelectZoneAsDestination = (zone: PotentialFishingZone) => {
    const bearing = (zone.lat > boat.lat ? 45 : 135);
    setBoat((prev) => ({
      ...prev,
      cog: bearing,
      sog: 7.2,
    }));
    setActiveTab('HELM');
    showToast(`🎯 Nav target set to ${zone.name}. Heading ${bearing}°`);
  };

  // Fleet Broadcast from Fisheries Dept
  const handleSendFleetBroadcast = (message: string) => {
    showToast(`📡 Broadcast transmitted across 868MHz LoRa Mesh to all sector boats!`);
    marineAudio.speakAlert(
      "மீன்வளத்துறை அவசர அறிவிப்பு அனைத்து படகுகளுக்கும் அனுப்பப்பட்டது.",
      "Department of Fisheries advisory transmitted to all vessels.",
      'YELLOW',
      true
    );
  };

  // ==========================================
  // VIEW 1: GATEWAY / INITIAL LOGIN SCREEN
  // (Shows Fisherman Login card on top & Admin Login card right below it!)
  // ==========================================
  if (sessionMode === 'GATEWAY') {
    return (
      <>
        <PortalGatewayScreen
          currentBoat={boat}
          onFishermanLogin={handleFishermanLoginFromGateway}
          onRegisterNewBoat={handleRegisterNewBoat}
          onOpenAdminLogin={() => setIsDeptLoginModalOpen(true)}
        />

        {/* Department Officer Secret Login Modal */}
        <DeptOfficerLoginModal
          isOpen={isDeptLoginModalOpen}
          onClose={() => setIsDeptLoginModalOpen(false)}
          onLoginSuccess={handleDeptOfficerLoginSuccess}
        />

        {/* Marineproject PostgreSQL Database Explorer Modal */}
        <MarineDatabaseModal
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen(false)}
          currentBoat={boat}
          currentAlert={alert}
        />
      </>
    );
  }

  // ==========================================
  // VIEW 2: ADMIN / DEPARTMENT COMMAND CENTER
  // (Exclusively for Admin / Authorized Officers)
  // ==========================================
  if (sessionMode === 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-tactical p-3 sm:p-5">
        <div className="max-w-7xl w-full mx-auto flex flex-col gap-4">
          {/* Top Admin Bar */}
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-500/70 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-950 shrink-0">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] tracking-wider uppercase border border-amber-500/40">
                    ADMIN COMMAND SESSION
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h1 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  Fisheries Department Coastal Surveillance & MRCC 1554
                </h1>
                <p className="text-xs font-tamil text-amber-200">
                  அதிகாரி: {deptOfficerName || 'Insp. R. Karunakaran (Mandapam Base)'}
                </p>
              </div>
            </div>

            {/* Database & Logout */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => setIsDatabaseModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer active:scale-95 shadow-md"
              >
                <Database className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>PostgreSQL DB (13 Tables)</span>
              </button>

              <button
                onClick={() => {
                  setDeptOfficerName(null);
                  setSessionMode('GATEWAY');
                  showToast('Admin session logged out.');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700 active:scale-95"
              >
                <LogOut className="w-4 h-4 text-amber-400" />
                <span>Exit Admin / Logout (வெளியேறு)</span>
              </button>
            </div>
          </div>

          {/* Official Fisheries Dashboard Component (with LoRa Telemetry, Fleet Tracking & Broadcast) */}
          <FisheriesDeptDashboard
            primaryBoat={boat}
            fleetBoats={fleetBoats}
            alert={alert}
            activeSOS={activeSOS}
            onSendFleetBroadcast={handleSendFleetBroadcast}
            onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
          />

          {/* Marineproject PostgreSQL Database Explorer Modal */}
          <MarineDatabaseModal
            isOpen={isDatabaseModalOpen}
            onClose={() => setIsDatabaseModalOpen(false)}
            currentBoat={boat}
            currentAlert={alert}
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: FISHERMAN MOBILE APP
  // (100% clean of admin boxes or dept tabs!)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-tactical pb-20 sm:pb-24">
      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Vessel Identity */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-800 border border-cyan-400/50 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50 shrink-0">
              <Compass className="w-5 h-5 text-cyan-200" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1 text-left">
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">{boat.name}</span>
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase border ${
                  alert.level === 'SAFE'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : alert.level === 'BREACH'
                    ? 'bg-rose-950/90 text-rose-300 border-rose-500 animate-pulse'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                }`}>
                  {alert.level}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="font-mono-num">{boat.regNumber}</span>
                <span>•</span>
                <span className="text-cyan-300 font-semibold">{boat.crewCount} Crew</span>
                <span>•</span>
                <button
                  onClick={() => setSessionMode('GATEWAY')}
                  className="text-cyan-400 hover:underline cursor-pointer"
                  title="Switch boat or return to login screen"
                >
                  Switch Boat / Exit
                </button>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Store & Forward Offline Quick Status Chip */}
            <button
              onClick={() => setActiveTab('OFFLINE')}
              title="Open Offline Tracking (Store and Forward) Console"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                syncStatus.isSimulatedOffline
                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                  : syncStatus.pendingCount > 0
                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {syncStatus.isSimulatedOffline ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden sm:inline">
                {syncStatus.isSimulatedOffline ? 'Store Mode' : 'Store & Forward'}
              </span>
              {syncStatus.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {syncStatus.pendingCount}
                </span>
              )}
            </button>

            {/* PostgreSQL Marine Database Explorer Button */}
            <button
              onClick={() => setIsDatabaseModalOpen(true)}
              title="Open PostgreSQL Database Explorer (13 Tables & SQL Console)"
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">DB (13 Tables)</span>
              <span className="sm:hidden text-[10px]">DB</span>
            </button>

            {/* Quick GPS Scenario Simulator Drawer */}
            <button
              onClick={() => setIsSimulatorModalOpen(true)}
              title="Open GPS Scenario Testing Simulator"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">GPS Test</span>
              <span className="font-tamil text-[11px] sm:hidden">சோதனை</span>
            </button>

            {/* Quick Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Alarms' : 'Mute Alarms'}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Direct 1-Tap SOS Distress Button */}
            <button
              onClick={() => setIsSOSModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg shadow-red-950 border border-red-400/50 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-cyan-950/95 border border-cyan-400/80 text-cyan-200 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-bounce max-w-[90vw] text-center">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Fisherman Navigation Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 flex flex-col gap-3">
        {/* Navigation HUD is always visible on top for instant situational awareness */}
        <NavigationHUD
          boat={boat}
          alert={alert}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
          voiceLang={voiceLang}
          onChangeVoiceLang={setVoiceLang}
          onTriggerSOSModal={() => setIsSOSModalOpen(true)}
        />

        {/* Tab 1: Primary Helm Navigator & Marine Chart */}
        {activeTab === 'HELM' && (
          <div className="flex flex-col gap-3">
            {/* Border Breach Advisory Banner */}
            {alert.level === 'BREACH' && (
              <div className="bg-gradient-to-r from-red-950 via-rose-950 to-red-950 border-2 border-red-500 rounded-2xl p-3.5 sm:p-4 shadow-2xl animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-lg shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                      🚨 BORDER CROSSED! VESSEL IS IN INTERNATIONAL WATERS
                    </h3>
                    <p className="text-xs sm:text-sm font-tamil text-amber-200 font-semibold mt-0.5">
                      படகு சர்வதேச கடல் எல்லையை கடந்துவிட்டது! உடனடியாக இந்திய எல்லைக்கு திசை திருப்பவும்.
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Recommended Course: Steer manual course <strong className="text-white font-bold">{alert.safeReturnBearing}° {alert.safeReturnDirectionEn}</strong> for {(alert.safeReturnDistanceMeters / 1000).toFixed(1)} km to return safely.
                    </p>
                    <p className="text-[11px] text-cyan-300 font-tamil mt-0.5">
                      (எச்சரிக்கை வழிகாட்டி மட்டுமே: மீனவர்கள் சுக்கானை கைமுறையாக இயக்க வேண்டும்)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => marineAudio.speakAlert(alert.messageTa, alert.messageEn, alert.level, true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
                  >
                    <Volume1 className="w-4 h-4" />
                    <span>ஒலி கேட்க</span>
                  </button>
                  <button
                    onClick={() => setIsSOSModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>SOS உதவி</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile View Mode Switcher Segmented Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setChartViewMode('VECTOR_CHART')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    chartViewMode === 'VECTOR_CHART'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 border border-cyan-400/40'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Vector Chart</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-400/20 text-emerald-200">ECDIS</span>
                </button>

                <button
                  onClick={() => setChartViewMode('OSM_MAP')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    chartViewMode === 'OSM_MAP'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 border border-cyan-400/40'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Satellite Map</span>
                </button>

                <button
                  onClick={() => setChartViewMode('3D_OCEAN')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    chartViewMode === '3D_OCEAN'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 border border-cyan-400/40'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <Compass className="w-4 h-4 text-cyan-300 animate-spin-slow" />
                  <span>3D Ocean Surface</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-200">WEBGL</span>
                </button>

                <button
                  onClick={() => setChartViewMode('SONAR_GRAPHS')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    chartViewMode === 'SONAR_GRAPHS'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950 border border-cyan-400/40'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Sonar Telemetry</span>
                </button>
              </div>

              {/* Map Layer Filter toggles */}
              {(chartViewMode === 'VECTOR_CHART' || chartViewMode === 'OSM_MAP') && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs overflow-x-auto pb-0.5">
                  <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-slate-300 cursor-pointer text-[11px] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showBuffers}
                      onChange={(e) => setShowBuffers(e.target.checked)}
                      className="accent-cyan-500 rounded"
                    />
                    <span>Buffers</span>
                  </label>

                  <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-slate-300 cursor-pointer text-[11px] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showPfz}
                      onChange={(e) => setShowPfz(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span>Fish Zones</span>
                  </label>

                  <label className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-slate-300 cursor-pointer text-[11px] whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showFleet}
                      onChange={(e) => setShowFleet(e.target.checked)}
                      className="accent-cyan-500 rounded"
                    />
                    <span>Fleet</span>
                  </label>
                </div>
              )}
            </div>

            {/* Visual Viewport Render (Shows primary boat + nearby boats) */}
            <div className="w-full">
              {chartViewMode === 'VECTOR_CHART' && (
                <TacticalVectorChart
                  boat={boat}
                  fleetBoats={fleetBoats}
                  alert={alert}
                  pfzZones={pfzZones}
                  wakeHistory={wakeHistory}
                  onBoatPositionChange={handleBoatPositionChange}
                  showPfz={showPfz}
                  showFleet={showFleet}
                  showBuffers={showBuffers}
                />
              )}

              {chartViewMode === 'OSM_MAP' && (
                <MarineMap
                  boat={boat}
                  fleetBoats={fleetBoats}
                  alert={alert}
                  pfzZones={pfzZones}
                  wakeHistory={wakeHistory}
                  onBoatPositionChange={handleBoatPositionChange}
                  showPfz={showPfz}
                  showFleet={showFleet}
                  showBuffers={showBuffers}
                />
              )}

              {chartViewMode === '3D_OCEAN' && (
                <Ocean3DSurface
                  boat={boat}
                  alert={alert}
                />
              )}

              {chartViewMode === 'SONAR_GRAPHS' && (
                <MarineTelemetryGraphs
                  boat={boat}
                  alert={alert}
                />
              )}
            </div>

            {/* Real-time Nearby Boats & Traffic Radar Display */}
            <NearbyVesselsRadar
              primaryBoat={boat}
              fleetBoats={fleetBoats}
              onSelectVessel={(selected) => {
                showToast(`Selected nearby vessel: ${selected.name} (${(Math.hypot(selected.lat - boat.lat, (selected.lng - boat.lng) * Math.cos(boat.lat * Math.PI / 180)) * 111).toFixed(1)} km away)`);
              }}
            />

            {/* Quick Testing Controller on Helm Tab */}
            <BoatControls
              boat={boat}
              alert={alert}
              isSimulating={isSimulating}
              onToggleSimulating={() => setIsSimulating(!isSimulating)}
              onSpeedChange={handleSpeedChange}
              onHeadingChange={handleHeadingChange}
              onResetPosition={handleResetPosition}
              isRealGpsMode={isRealGpsMode}
              onToggleGpsMode={() => setIsRealGpsMode(!isRealGpsMode)}
            />
          </div>
        )}

        {/* Tab 2: Dedicated Boundary Alert Detail View */}
        {activeTab === 'ALERTS' && (
          <BoundaryAlertDetailView
            boat={boat}
            alert={alert}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            voiceLang={voiceLang}
            onChangeVoiceLang={setVoiceLang}
            onJumpToPreset={handleResetPosition}
          />
        )}

        {/* Tab 3: Marine Weather & Cyclone Alerts */}
        {activeTab === 'WEATHER' && (
          <WeatherAlertView
            weather={weather}
            onUpdateWeather={(newW) => {
              setWeather(newW);
              showToast('Weather advisory updated!');
            }}
          />
        )}

        {/* Tab 4: AI Potential Fishing Zones */}
        {activeTab === 'PFZ' && (
          <FishingZonesView
            zones={pfzZones}
            boat={boat}
            onSelectZoneAsDestination={handleSelectZoneAsDestination}
          />
        )}

        {/* Tab 5: Family Mobile Tracking View */}
        {activeTab === 'FAMILY' && (
          <FamilyTrackingView
            boat={boat}
            alert={alert}
          />
        )}

        {/* Tab 6: Offline Tracking (Store & Forward) */}
        {activeTab === 'OFFLINE' && (
          <OfflineTrackingView
            boat={boat}
            onJumpToPosition={handleBoatPositionChange}
          />
        )}
      </main>

      {/* Mobile Modal Drawer for Simulator Testing */}
      {isSimulatorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                GPS Telemetry & Alert Testing
              </h3>
              <button
                onClick={() => setIsSimulatorModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <BoatControls
              boat={boat}
              alert={alert}
              isSimulating={isSimulating}
              onToggleSimulating={() => setIsSimulating(!isSimulating)}
              onSpeedChange={handleSpeedChange}
              onHeadingChange={handleHeadingChange}
              onResetPosition={handleResetPosition}
              isRealGpsMode={isRealGpsMode}
              onToggleGpsMode={() => setIsRealGpsMode(!isRealGpsMode)}
              onClose={() => setIsSimulatorModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* SOS Emergency Rescue Dialog Modal */}
      <SOSRescueModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        boat={boat}
        activeSOS={activeSOS}
        onTriggerSOS={handleTriggerSOS}
        onResolveSOS={handleResolveSOS}
      />

      {/* Fixed Mobile Bottom Navigation Bar (Fisherman App ONLY - 6 clean tabs, no admin box) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 shadow-2xl px-2 py-1.5 flex items-center justify-around max-w-md mx-auto sm:max-w-none">
        <button
          onClick={() => setActiveTab('HELM')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[46px] ${
            activeTab === 'HELM'
              ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">Helm</span>
          <span className="text-[8px] font-tamil text-slate-500">சுக்கான்</span>
        </button>

        <button
          onClick={() => setActiveTab('ALERTS')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[46px] relative ${
            activeTab === 'ALERTS'
              ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">Alerts</span>
          <span className="text-[8px] font-tamil text-slate-500">எல்லை</span>
          {alert.level !== 'SAFE' && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('OFFLINE')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[46px] relative ${
            activeTab === 'OFFLINE'
              ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HardDrive className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">Offline</span>
          <span className="text-[8px] font-tamil text-slate-500">ஆஃப்லைன்</span>
          {syncStatus.pendingCount > 0 && (
            <span className="absolute top-1 right-1 px-1 rounded-full text-[8px] font-bold bg-amber-500 text-slate-950">
              {syncStatus.pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('WEATHER')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[46px] relative ${
            activeTab === 'WEATHER'
              ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CloudRain className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">Weather</span>
          <span className="text-[8px] font-tamil text-slate-500">வானிலை</span>
          {weather.cycloneStatus !== 'NO_WARNING' && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('PFZ')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[46px] ${
            activeTab === 'PFZ'
              ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Fish className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">Fish PFZ</span>
          <span className="text-[8px] font-tamil text-slate-500">மீன்வளம்</span>
        </button>

        <button
          onClick={() => setActiveTab('FAMILY')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[50px] min-h-[46px] ${
            activeTab === 'FAMILY'
              ? 'text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight">Family</span>
          <span className="text-[8px] font-tamil text-slate-500">குடும்பம்</span>
        </button>
      </nav>

      {/* Marineproject PostgreSQL Database Explorer Modal */}
      <MarineDatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        currentBoat={boat}
        currentAlert={alert}
      />
    </div>
  );
}
