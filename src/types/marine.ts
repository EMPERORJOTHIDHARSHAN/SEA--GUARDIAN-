export type AlertLevel = 'SAFE' | 'YELLOW' | 'ORANGE' | 'RED' | 'BREACH';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundaryPoint extends Coordinates {
  id: string;
  name: string;
  nameTa?: string;
  treatyPoint?: number;
  dmsNotation?: string;
}

export interface BoatState {
  id: string;
  name: string;
  regNumber: string;
  type: string;
  skipperName: string;
  crewCount: number;
  homePort: string;
  lat: number;
  lng: number;
  sog: number; // Speed Over Ground in knots
  cog: number; // Course Over Ground in degrees (0-359)
  batteryVolts: number;
  fuelPercent: number;
  gsmSignal: number; // 0 to 4 bars
  loraSignalRssi: number; // e.g. -72 dBm
  satelliteCount: number;
  hdop: number;
  isEngineRunning: boolean;
  lastUpdated: string;
}

export interface AlertState {
  level: AlertLevel;
  distanceMeters: number;
  closestPoint: Coordinates;
  safeReturnBearing: number; // degrees to head to return safely
  safeReturnDistanceMeters: number;
  safeReturnDirectionEn: string;
  safeReturnDirectionTa: string;
  messageEn: string;
  messageTa: string;
  timestamp: string;
  isAudioActive: boolean;
}

export interface SOSDistress {
  id: string;
  boatId: string;
  boatName: string;
  regNumber: string;
  lat: number;
  lng: number;
  timestamp: string;
  reason: 'ENGINE_FAILURE' | 'STORM_CYCLONE' | 'MEDICAL_EMERGENCY' | 'VESSEL_FLOODING' | 'FOREIGN_INTERCEPTION';
  status: 'BROADCASTING' | 'ACKNOWLEDGED_MRCC' | 'COAST_GUARD_DISPATCHED' | 'RESCUE_IN_PROGRESS' | 'RESOLVED';
  responders: string[];
  etaMinutes: number;
  contactNumber: string;
  familyNotified: boolean;
  notes: string;
}

export interface WeatherData {
  seaState: 'Calm' | 'Moderate' | 'Rough' | 'Very Rough' | 'Phenomenal';
  seaStateTa: string;
  waveHeightM: number;
  swellPeriodSec: number;
  windKnots: number;
  windDirectionDeg: number;
  windDirectionLabel: string;
  gustKnots: number;
  visibilityKm: number;
  waterTempC: number;
  airPressureHpa: number;
  cycloneStatus: 'NO_WARNING' | 'ALERT_YELLOW' | 'WARNING_ORANGE' | 'DANGER_RED';
  cycloneTitleEn: string;
  cycloneTitleTa: string;
  advisoryEn: string;
  advisoryTa: string;
  issuedBy: string;
  validUntil: string;
}

export interface PotentialFishingZone {
  id: string;
  name: string;
  nameTa: string;
  lat: number;
  lng: number;
  depthMeters: number;
  surfaceTempC: number;
  chlorophyllMgM3: number;
  catchProbabilityPercent: number;
  targetSpecies: string[];
  safeDistanceToIMBLKm: number;
  isWithinIndianWaters: boolean;
  advisedRoute: string;
}

export interface TelemetryPacket {
  id: string;
  timestamp: string;
  source: 'NEO-6M_GPS' | 'SX1278_LORA' | 'ESP32_TELEMETRY' | 'GSM_MQTT';
  rawNmea?: string;
  loraHex?: string;
  decoded: {
    lat: number;
    lng: number;
    speedKnots: number;
    bearingDeg: number;
    distToBorderM: number;
    alertStatus: AlertLevel;
    batteryV: number;
  };
}

export interface OfflineTelemetryPoint {
  id?: number;
  uuid: string;
  boatId: string;
  boatRegNo: string;
  boatName: string;
  lat: number;
  lng: number;
  sog: number; // Speed in knots
  cog: number; // Course/heading degrees
  batteryPercent: number;
  alertLevel: AlertLevel;
  distanceToBorderNm: number;
  recordedAt: string; // ISO string
  synced: boolean; // false = locally stored in IndexedDB, true = forwarded to Cloud DB
  syncedAt?: string;
  source: 'OFFLINE_GNSS_STORE' | 'MANUAL_WAYPOINT' | 'SIMULATED_TRACK';
}

export interface OfflineStoreStats {
  totalStoredCount: number;
  unsyncedCount: number;
  syncedCount: number;
  lastRecordTime?: string;
  lastSyncTime?: string;
  isOnline: boolean;
  storageType: 'INDEXED_DB' | 'LOCAL_STORAGE';
}
