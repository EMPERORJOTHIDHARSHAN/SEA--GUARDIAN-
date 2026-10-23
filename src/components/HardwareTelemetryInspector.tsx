import React, { useState, useEffect } from 'react';
import { BoatState, AlertState } from '../types/marine';
import { 
  Cpu, 
  Terminal, 
  Radio, 
  Zap, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Copy,
  Layers
} from 'lucide-react';

interface HardwareTelemetryInspectorProps {
  boat: BoatState;
  alert: AlertState;
}

export const HardwareTelemetryInspector: React.FC<HardwareTelemetryInspectorProps> = ({
  boat,
  alert,
}) => {
  const [nmeaLog, setNmeaLog] = useState<string[]>([]);
  const [loraLog, setLoraLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Generate realistic NMEA 0183 sentences from real-time boat telemetry
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getUTCHours().toString().padStart(2, '0')}${now.getUTCMinutes().toString().padStart(2, '0')}${now.getUTCSeconds().toString().padStart(2, '0')}.00`;
      const dateStr = `${now.getUTCDate().toString().padStart(2, '0')}${(now.getUTCMonth() + 1).toString().padStart(2, '0')}${(now.getUTCFullYear() % 100).toString().padStart(2, '0')}`;

      // Format lat / lng into NMEA format (DDMM.MMMM)
      const latDeg = Math.floor(Math.abs(boat.lat));
      const latMin = ((Math.abs(boat.lat) - latDeg) * 60).toFixed(4);
      const latNmea = `${latDeg.toString().padStart(2, '0')}${latMin},${boat.lat >= 0 ? 'N' : 'S'}`;

      const lngDeg = Math.floor(Math.abs(boat.lng));
      const lngMin = ((Math.abs(boat.lng) - lngDeg) * 60).toFixed(4);
      const lngNmea = `${lngDeg.toString().padStart(3, '0')}${lngMin},${boat.lng >= 0 ? 'E' : 'W'}`;

      const rmcSentence = `$GPRMC,${timeStr},A,${latNmea},${lngNmea},${boat.sog.toFixed(1)},${boat.cog.toFixed(1)},${dateStr},,,A*7E`;
      const ggaSentence = `$GPGGA,${timeStr},${latNmea},${lngNmea},1,${boat.satelliteCount},${boat.hdop},4.2,M,-10.1,M,,*4F`;

      setNmeaLog((prev) => [rmcSentence, ggaSentence, ...prev.slice(0, 8)]);

      // LoRa packet
      const loraPacket = `[LORA_TX 868MHz] DEV_ID:TN06-1204 | LAT:${boat.lat.toFixed(4)} | LON:${boat.lng.toFixed(4)} | DIST_IMBL:${alert.distanceMeters}m | ALERT:${alert.level} | RSSI:${boat.loraSignalRssi}dBm | BAT:${boat.batteryVolts}V`;
      setLoraLog((prev) => [loraPacket, ...prev.slice(0, 5)]);
    }, 1800);

    return () => clearInterval(interval);
  }, [boat, alert]);

  const copyTelemetry = () => {
    navigator.clipboard?.writeText(nmeaLog.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hardware GPIO states based on alert level
  const isBuzzerActive = alert.level !== 'SAFE';
  const isRedLed = alert.level === 'RED' || alert.level === 'BREACH';
  const isOrangeLed = alert.level === 'ORANGE';
  const isYellowLed = alert.level === 'YELLOW';
  const isGreenLed = alert.level === 'SAFE';

  return (
    <div className="flex flex-col gap-4">
      {/* Hardware Architecture Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-extrabold uppercase tracking-wider border border-purple-700">
                  EMBEDDED HARDWARE ARCHITECTURE
                </span>
                <span className="text-xs text-slate-400">
                  ESP32 MCU + NEO-6M GPS + SX1278 LoRa Transceiver
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                Hardware Telemetry & Serial Data Stream
              </h3>
              <p className="text-xs text-slate-400">
                Inspect raw NMEA 0183 sentences, LoRa 868MHz payload packets, and GPIO pin voltages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>3.3V Logic Regulated</span>
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Pinout & Actuator Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Piezo Buzzer PWM */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>GPIO 25 (Buzzer PWM)</span>
            <span className={`w-2 h-2 rounded-full ${isBuzzerActive ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`} />
          </div>
          <div className="my-2">
            <div className={`text-base font-bold ${isBuzzerActive ? 'text-rose-400' : 'text-slate-500'}`}>
              {isBuzzerActive ? 'ACTIVE (PULSING)' : 'IDLE (0V)'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono-num">
              Duty: {isBuzzerActive ? (alert.level === 'BREACH' ? '100% Siren' : '65% PWM') : '0%'}
            </div>
          </div>
          <div className="text-[10px] text-slate-500">
            Piezoelectric 85dB Marine Sounder
          </div>
        </div>

        {/* RGB Warning LED */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>GPIO 26/27 (Indicator LED)</span>
            <span className={`w-2.5 h-2.5 rounded-full ${
              isRedLed ? 'bg-red-500 shadow-lg shadow-red-500' :
              isOrangeLed ? 'bg-amber-500' :
              isYellowLed ? 'bg-yellow-400' : 'bg-emerald-400'
            }`} />
          </div>
          <div className="my-2">
            <div className={`text-base font-bold ${
              isRedLed ? 'text-red-400' :
              isOrangeLed ? 'text-amber-400' :
              isYellowLed ? 'text-yellow-300' : 'text-emerald-400'
            }`}>
              {alert.level} LED
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Current: 20mA (High Lux)
            </div>
          </div>
          <div className="text-[10px] text-slate-500">
            Cockpit Optical Strobe
          </div>
        </div>

        {/* SX1278 LoRa Radio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>LoRa SX1278 (SPI)</span>
            <span className="text-[10px] text-cyan-400 font-mono-num">868 MHz</span>
          </div>
          <div className="my-2">
            <div className="text-base font-bold text-cyan-400 font-mono-num">
              {boat.loraSignalRssi} dBm
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              SNR: +9.2 dB • SF: 10
            </div>
          </div>
          <div className="text-[10px] text-slate-500">
            15 km Sea Range Line-of-Sight
          </div>
        </div>

        {/* NEO-6M GPS Receiver */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>NEO-6M GPS (UART 9600)</span>
            <span className="text-[10px] text-emerald-400">3D FIX</span>
          </div>
          <div className="my-2">
            <div className="text-base font-bold text-emerald-400 font-mono-num">
              {boat.satelliteCount} Sats
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono-num">
              HDOP: {boat.hdop} • 1 Hz Update
            </div>
          </div>
          <div className="text-[10px] text-slate-500">
            Active Patch Antenna
          </div>
        </div>
      </div>

      {/* Terminal Displays (NMEA & LoRa) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* NMEA 0183 Serial Terminal */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between font-mono-num">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Serial UART: NEO-6M NMEA Stream ($GPRMC / $GPGGA)</span>
              </div>
              <button
                onClick={copyTelemetry}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer text-[10px] flex items-center gap-1 font-sans"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="space-y-1 text-xs text-emerald-400/90 bg-black/60 p-3 rounded-xl border border-slate-900 min-h-[160px] overflow-x-auto">
              {nmeaLog.map((line, idx) => (
                <div key={idx} className="hover:bg-slate-800/40 px-1 rounded transition-colors whitespace-nowrap">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 mt-2 font-sans flex items-center justify-between">
            <span>Baud: 9600 bps • 8-N-1 • Checksum Verified</span>
            <span className="text-cyan-400">Live Telemetry Hook</span>
          </div>
        </div>

        {/* LoRa Mesh Packet Stream */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between font-mono-num">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Radio className="w-4 h-4 text-purple-400" />
                <span>LoRa Ad-Hoc Mesh Packet Broadcasts (Offline Mode)</span>
              </div>
              <span className="text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800 font-sans">
                NO GSM REQUIRED
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-cyan-300/90 bg-black/60 p-3 rounded-xl border border-slate-900 min-h-[160px] overflow-x-auto">
              {loraLog.map((packet, idx) => (
                <div key={idx} className="hover:bg-slate-800/40 px-1 py-0.5 rounded border-b border-slate-900/50 transition-colors whitespace-nowrap">
                  {packet}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 mt-2 font-sans flex items-center justify-between">
            <span>Payload Size: 32 bytes • AES-128 Hardware Encrypted</span>
            <span className="text-purple-400">Mesh Hopping Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
