/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Table, 
  RefreshCw, 
  Download, 
  Server, 
  HardDrive, 
  CheckCircle2, 
  ExternalLink,
  Search,
  Code,
  Laptop
} from 'lucide-react';
import { getAllPoints } from '../utils/offlineTrackerDb';

interface DbUserRow {
  id: number;
  name: string;
  email: string;
  boat_name?: string;
  crew_count?: number;
  home_port?: string;
  reg_number?: string;
  role?: string;
  created_at?: string;
}

interface CloudTelemetryRow {
  id: number;
  uuid: string;
  boatRegNo: string;
  boatName: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  batteryPercent: number;
  alertLevel: string;
  distanceToBorderNm: number;
  recordedAt: string;
  forwardedAt: string;
}

interface DatabaseInspectorViewProps {
  onClose?: () => void;
}

export const DatabaseInspectorView: React.FC<DatabaseInspectorViewProps> = ({ onClose }) => {
  const [activeTable, setActiveTable] = useState<'users' | 'telemetry_cloud' | 'telemetry_offline' | 'schema_guide'>('users');
  const [users, setUsers] = useState<DbUserRow[]>([]);
  const [cloudTelemetry, setCloudTelemetry] = useState<CloudTelemetryRow[]>([]);
  const [offlinePoints, setOfflinePoints] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawJsonView, setRawJsonView] = useState(false);

  // Fetch all live database tables from backend & local storage
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users
      const userRes = await fetch('/api/users');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData.users || []);
      }

      // 2. Fetch Cloud Telemetry (Store & Forward backend store)
      const telRes = await fetch('/api/telemetry/history');
      if (telRes.ok) {
        const telData = await telRes.json();
        setCloudTelemetry(telData.history || []);
      }

      // 3. Fetch System Health / DB Status
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setDbStatus(healthData);
      }

      // 4. Fetch Client-Side IndexedDB Offline Points
      const localPts = await getAllPoints();
      setOfflinePoints(localPts || []);
    } catch (err) {
      console.error('Failed to load database inspector data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Export SQL Dump
  const exportSqlDump = () => {
    let sql = `-- Sea Guardian Live Database Dump\n-- Generated on: ${new Date().toISOString()}\n\n`;

    sql += `-- Table: users\n`;
    sql += `CREATE TABLE IF NOT EXISTS users (\n`;
    sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
    sql += `  name VARCHAR(100) NOT NULL,\n`;
    sql += `  email VARCHAR(150) NOT NULL UNIQUE,\n`;
    sql += `  boat_name VARCHAR(150),\n`;
    sql += `  crew_count INT DEFAULT 1,\n`;
    sql += `  home_port VARCHAR(150),\n`;
    sql += `  reg_number VARCHAR(100),\n`;
    sql += `  role VARCHAR(50) DEFAULT 'FISHERMAN',\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n`;

    if (users.length > 0) {
      sql += `INSERT INTO users (id, name, email, boat_name, crew_count, home_port, reg_number, role, created_at) VALUES\n`;
      const userTuples = users.map(u => 
        `  (${u.id}, '${u.name.replace(/'/g, "''")}', '${u.email}', ${u.boat_name ? `'${u.boat_name}'` : 'NULL'}, ${u.crew_count || 1}, '${u.home_port || 'Rameswaram'}', ${u.reg_number ? `'${u.reg_number}'` : 'NULL'}, '${u.role || 'FISHERMAN'}', '${u.created_at || new Date().toISOString()}')`
      );
      sql += userTuples.join(',\n') + ';\n\n';
    }

    sql += `-- Table: cloud_telemetry_logs\n`;
    sql += `CREATE TABLE IF NOT EXISTS cloud_telemetry_logs (\n`;
    sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
    sql += `  uuid VARCHAR(100) NOT NULL UNIQUE,\n`;
    sql += `  boat_reg_no VARCHAR(100) NOT NULL,\n`;
    sql += `  boat_name VARCHAR(150),\n`;
    sql += `  latitude DECIMAL(10, 6) NOT NULL,\n`;
    sql += `  longitude DECIMAL(10, 6) NOT NULL,\n`;
    sql += `  speed_knots DECIMAL(5, 2),\n`;
    sql += `  course_deg DECIMAL(5, 2),\n`;
    sql += `  battery_percent INT,\n`;
    sql += `  alert_level VARCHAR(30),\n`;
    sql += `  distance_to_border_nm DECIMAL(6, 2),\n`;
    sql += `  recorded_at TIMESTAMP,\n`;
    sql += `  forwarded_at TIMESTAMP\n);\n\n`;

    if (cloudTelemetry.length > 0) {
      sql += `INSERT INTO cloud_telemetry_logs (id, uuid, boat_reg_no, boat_name, latitude, longitude, speed_knots, course_deg, battery_percent, alert_level, distance_to_border_nm, recorded_at, forwarded_at) VALUES\n`;
      const telTuples = cloudTelemetry.map(t => 
        `  (${t.id}, '${t.uuid}', '${t.boatRegNo}', '${t.boatName}', ${t.lat}, ${t.lng}, ${t.sog}, ${t.cog}, ${t.batteryPercent}, '${t.alertLevel}', ${t.distanceToBorderNm}, '${t.recordedAt}', '${t.forwardedAt}')`
      );
      sql += telTuples.join(',\n') + ';\n\n';
    }

    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seafisher_db_dump_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.reg_number && u.reg_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.boat_name && u.boat_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCloud = cloudTelemetry.filter(t => 
    t.boatRegNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.boatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.alertLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOffline = offlinePoints.filter(p => 
    (p.boatRegNo && p.boatRegNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.boatName && p.boatName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl text-slate-100 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Live Database Inspector
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  நேரடி டேட்டாபேஸ் பார்வை
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                இந்த ஆப்பில் சேமிக்கப்பட்டுள்ள நேரடி அட்டவணைகள், Tuples மற்றும் Data பதிவுகளை உடனுக்குடன் பார்வையிடும் பக்கம்.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchAllData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh (புதுப்பி)</span>
          </button>

          <button
            onClick={() => setRawJsonView(!rawJsonView)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span>{rawJsonView ? 'Table Mode' : 'Raw JSON Mode'}</span>
          </button>

          <button
            onClick={exportSqlDump}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SQL (.sql Dump)</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Info Banner: Where is the data stored? */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Backend In-Memory / MySQL Status */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              1. Cloud / Backend Storage
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
              RAM Memory / MySQL
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Database Engine:</span>
              <span className="font-mono text-amber-300 font-bold">Node.js Memory / MySQL Driver</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Registered Users:</span>
              <span className="font-mono text-emerald-400 font-bold">{users.length} Records</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Telemetry Cloud Logs:</span>
              <span className="font-mono text-cyan-400 font-bold">{cloudTelemetry.length} Points</span>
            </div>
          </div>
        </div>

        {/* Client-Side IndexedDB Status */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              2. Browser IndexedDB (Local DB)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              Desktop Disk Storage
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Database Name:</span>
              <span className="font-mono text-white text-[11px]">MaritimeSafetyOfflineDB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Offline Recorded Waypoints:</span>
              <span className="font-mono text-emerald-400 font-bold">{offlinePoints.length} Saved in Browser</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              F12 Inspect ➜ Application ➜ IndexedDB ➜ telemetry_logs வழியாகவும் பார்க்கலாம்.
            </p>
          </div>
        </div>

        {/* Local Desktop MySQL Setup Guide */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-amber-400" />
              3. உங்கள் Desktop MySQL-ல் பார்ப்பது
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
              XAMPP / Workbench
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            உங்கள் கம்ப்யூட்டரில் உள்ள <b>MySQL Workbench</b> அல்லது <b>phpMyAdmin</b>-ல் பார்க்க, மேலே உள்ள <b>Export SQL</b> பட்டனை அழுத்தி இம்போர்ட் செய்யலாம்!
          </p>
        </div>
      </div>

      {/* Table Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTable('users')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTable === 'users'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Table: users ({users.length})</span>
          <span className="text-[10px] opacity-75">மீனவர்கள் & அதிகாரிகள்</span>
        </button>

        <button
          onClick={() => setActiveTable('telemetry_cloud')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTable === 'telemetry_cloud'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Table: cloud_telemetry_logs ({cloudTelemetry.length})</span>
          <span className="text-[10px] opacity-75">கிளவுட் ஜிபிஎஸ் டேட்டா</span>
        </button>

        <button
          onClick={() => setActiveTable('telemetry_offline')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTable === 'telemetry_offline'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Browser: IndexedDB Offline ({offlinePoints.length})</span>
          <span className="text-[10px] opacity-75">ஆஃப்லைன் பதிவுகள்</span>
        </button>

        <button
          onClick={() => setActiveTable('schema_guide')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTable === 'schema_guide'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Desktop MySQL இணைப்பு வழிகாட்டி</span>
        </button>
      </div>

      {/* Search Bar */}
      {activeTable !== 'schema_guide' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, boat number, status (தேடுக)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Raw JSON View Option */}
      {rawJsonView && activeTable !== 'schema_guide' && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 max-h-96 overflow-y-auto">
          <pre>
            {JSON.stringify(
              activeTable === 'users' ? filteredUsers : activeTable === 'telemetry_cloud' ? filteredCloud : filteredOffline,
              null,
              2
            )}
          </pre>
        </div>
      )}

      {/* TAB 1: USERS TABLE */}
      {!rawJsonView && activeTable === 'users' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <th className="p-3">ID</th>
                <th className="p-3">Name (பெயர்)</th>
                <th className="p-3">Email (மின்னஞ்சல்)</th>
                <th className="p-3">Boat Name (படகு)</th>
                <th className="p-3">Reg Number (பதிவு எண்)</th>
                <th className="p-3">Crew</th>
                <th className="p-3">Home Port (துறைமுகம்)</th>
                <th className="p-3">Role</th>
                <th className="p-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-mono text-amber-400 font-bold">{u.id}</td>
                    <td className="p-3 font-semibold text-white">{u.name}</td>
                    <td className="p-3 font-mono text-slate-300">{u.email}</td>
                    <td className="p-3 text-cyan-300">{u.boat_name || '-'}</td>
                    <td className="p-3 font-mono text-emerald-400 font-semibold">{u.reg_number || '-'}</td>
                    <td className="p-3">{u.crew_count || 1}</td>
                    <td className="p-3 text-slate-300">{u.home_port || 'Rameswaram'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        {u.role || 'FISHERMAN'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CLOUD TELEMETRY TABLE */}
      {!rawJsonView && activeTable === 'telemetry_cloud' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <th className="p-3">ID</th>
                <th className="p-3">Boat Reg No</th>
                <th className="p-3">Boat Name</th>
                <th className="p-3">Latitude</th>
                <th className="p-3">Longitude</th>
                <th className="p-3">Speed (SOG)</th>
                <th className="p-3">Border Dist</th>
                <th className="p-3">Alert</th>
                <th className="p-3">Battery</th>
                <th className="p-3">Recorded At</th>
                <th className="p-3">Forwarded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredCloud.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-500">
                    No cloud telemetry points saved yet. Perform a Store & Forward Sync to populate this table!
                  </td>
                </tr>
              ) : (
                filteredCloud.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-mono text-cyan-400 font-bold">{t.id}</td>
                    <td className="p-3 font-mono font-bold text-white">{t.boatRegNo}</td>
                    <td className="p-3 text-slate-300">{t.boatName}</td>
                    <td className="p-3 font-mono text-emerald-400">{t.lat.toFixed(4)}° N</td>
                    <td className="p-3 font-mono text-emerald-400">{t.lng.toFixed(4)}° E</td>
                    <td className="p-3 font-mono">{t.sog} kts</td>
                    <td className="p-3 font-mono text-amber-300">{t.distanceToBorderNm} NM</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.alertLevel === 'SAFE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        t.alertLevel === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {t.alertLevel}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{t.batteryPercent}%</td>
                    <td className="p-3 text-slate-400 text-[11px]">{new Date(t.recordedAt).toLocaleTimeString()}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{new Date(t.forwardedAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: INDEXEDDB OFFLINE TABLE */}
      {!rawJsonView && activeTable === 'telemetry_offline' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                <th className="p-3">UUID</th>
                <th className="p-3">Boat Reg</th>
                <th className="p-3">Lat / Lng</th>
                <th className="p-3">Speed</th>
                <th className="p-3">Border Distance</th>
                <th className="p-3">Status</th>
                <th className="p-3">Cloud Synced?</th>
                <th className="p-3">Recorded Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredOffline.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    Browser IndexedDB-ல் பதிவுகள் இல்லை. Store & Forward பக்கத்தில் 'Record Waypoint' அழுத்தவும்!
                  </td>
                </tr>
              ) : (
                filteredOffline.map((p, idx) => (
                  <tr key={p.uuid || idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-slate-400">{String(p.uuid).substring(0, 12)}...</td>
                    <td className="p-3 font-mono font-bold text-white">{p.boatRegNo}</td>
                    <td className="p-3 font-mono text-emerald-400">{p.lat?.toFixed(4)}°, {p.lng?.toFixed(4)}°</td>
                    <td className="p-3 font-mono">{p.sog || 0} kts</td>
                    <td className="p-3 font-mono text-amber-300">{p.distanceToBorderNm || 0} NM</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                        {p.alertLevel || 'SAFE'}
                      </span>
                    </td>
                    <td className="p-3">
                      {p.synced ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          YES (SYNCED)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          PENDING (OFFLINE)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">{new Date(p.recordedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: HOW TO CONNECT DESKTOP MYSQL */}
      {activeTable === 'schema_guide' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-amber-400" />
              உங்கள் லோக்கல் கம்ப்யூட்டரில் உள்ள MySQL உடன் இணைப்பது எப்படி?
            </h3>
            <p className="text-slate-300 leading-relaxed">
              இந்த Cloud ஆப்பில் இணையத்தில் இயங்கும் போது தற்காலிக <b>In-Memory & IndexedDB</b> பயன்படுத்தப்படுகிறது. 
              இந்த ஆப்பினை நீங்கள் உங்கள் லோக்கல் டெஸ்க்டாப்பில் (Localhost) இயக்கும் போது, உங்கள் கணினியில் உள்ள <b>MySQL / XAMPP / MySQL Workbench</b> டேட்டாபேஸை நேரடியாகப் பயன்படுத்த முடியும்.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">படி 1: .env ஃபைல் கான்பிகரேஷன்</span>
                <p className="text-[11px] text-slate-400 mb-2">உங்கள் புராஜெக்ட் ரூட் ஃபோல்டரில் உள்ள `.env` ஃபைலில் உங்கள் MySQL தகவலைக் கொடுக்கவும்:</p>
                <pre className="p-2.5 rounded bg-black/60 font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=seafisher_db
DB_PORT=3306`}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">படி 2: தானாகவே டேபிள் கிரியேட் ஆகும்</span>
                <p className="text-[11px] text-slate-400 mb-2">
                  `src/server/db.ts` கோப்பில் ஆட்டோ-கனெக்ட் கோடு ஏற்கனவே எழுதப்பட்டுள்ளது. நீங்கள் சர்வரை ஸ்டார்ட் செய்த உடன்:
                </p>
                <div className="p-2.5 rounded bg-black/60 font-mono text-[11px] text-cyan-300">
                  ✅ Connected to MySQL Database successfully!<br/>
                  ✅ MySQL `users` table verified/created.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-900/60 mt-3">
              <span className="font-bold text-blue-300 block mb-1">படி 3: MySQL Workbench அல்லது phpMyAdmin-ல் பார்ப்பது</span>
              <p className="text-slate-300 text-[11px]">
                மேலே உள்ள <b>"Export SQL (.sql Dump)"</b> பட்டனை கிளிக் செய்தால் ஒரு `.sql` ஃபைல் டவுன்லோட் ஆகும். 
                அதை உங்கள் MySQL Workbench-ல் திறந்து <b>Run/Execute</b> கொடுத்தால், இப்போதே அனைத்து டேபிள்களும், பதிவுகளும் உங்கள் லோக்கல் டேட்டாபேஸில் வந்துவிடும்!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer helper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3 gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>அனைத்து டேட்டாபேஸ் பதிவுகளும் (Records) நேரடியாக REST API & IndexedDB மூலமாக எடுக்கப்படுகின்றன.</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/users"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
          >
            <span>/api/users (JSON)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/api/telemetry/history"
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
          >
            <span>/api/telemetry/history (JSON)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
