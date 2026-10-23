/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Table, 
  Terminal, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Search, 
  X, 
  Play, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Anchor, 
  Users, 
  AlertTriangle, 
  Bell, 
  Compass, 
  CloudRain,
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react';
import { BoatState, AlertState } from '../types/marine';

interface MarineDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoat?: BoatState;
  currentAlert?: AlertState;
}

interface TableSummary {
  name: string;
  count: number;
  columns: string[];
  description: string;
}

interface DbStatus {
  connected: boolean;
  driver: string;
  host: string;
  database: string;
  schema: string;
  totalTables: number;
  totalRecords: number;
  tables: TableSummary[];
  lastSyncAt: string;
}

const TABLE_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="w-4 h-4 text-emerald-400" />,
  boats: <Anchor className="w-4 h-4 text-cyan-400" />,
  devices: <Cpu className="w-4 h-4 text-amber-400" />,
  boat_current_locations: <Radio className="w-4 h-4 text-teal-400" />,
  boat_locations: <Layers className="w-4 h-4 text-indigo-400" />,
  maritime_boundaries: <ShieldCheck className="w-4 h-4 text-red-400" />,
  safety_zones: <ShieldCheck className="w-4 h-4 text-green-400" />,
  boundary_events: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  sos_events: <AlertCircle className="w-4 h-4 text-red-500" />,
  boat_access: <Users className="w-4 h-4 text-purple-400" />,
  marine_weather: <CloudRain className="w-4 h-4 text-sky-400" />,
  sensor_readings: <Compass className="w-4 h-4 text-orange-400" />,
  notifications: <Bell className="w-4 h-4 text-yellow-400" />,
};

export const MarineDatabaseModal: React.FC<MarineDatabaseModalProps> = ({
  isOpen,
  onClose,
  currentBoat,
  currentAlert,
}) => {
  const [activeView, setActiveView] = useState<'TABLES' | 'SQL_CONSOLE' | 'SETTINGS' | 'DOCS'>('TABLES');
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  
  // SQL Console State
  const [customSql, setCustomSql] = useState('SELECT * FROM users;');
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTimeMs: number;
    driver: string;
  } | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  // Sync state
  const [isSyncingWithBoat, setIsSyncingWithBoat] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Connection settings state
  const [connString, setConnString] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Fetch status
  const fetchDbStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/marine-db/status');
      const data = await res.json();
      if (data.success) {
        setDbStatus(data.status);
      }
    } catch (err) {
      console.error('Error fetching marine DB status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific table
  const fetchTableRows = async (tableName: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marine-db/tables/${tableName}?limit=100`);
      const data = await res.json();
      if (data.success) {
        setTableData(data.rows || []);
        setTableColumns(data.columns || []);
      }
    } catch (err) {
      console.error(`Error fetching table ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDbStatus();
      fetchTableRows(selectedTable);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedTable) {
      fetchTableRows(selectedTable);
    }
  }, [selectedTable]);

  // Run SQL Query
  const handleExecuteSql = async (queryToRun?: string) => {
    const q = queryToRun || customSql;
    if (!q.trim()) return;

    try {
      setSqlRunning(true);
      setSqlError(null);
      const res = await fetch('/api/marine-db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: q }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSqlError(data.message || 'Error executing query');
        setSqlResult(null);
      } else {
        setSqlResult({
          columns: data.columns || [],
          rows: data.rows || [],
          rowCount: data.rowCount || 0,
          executionTimeMs: data.executionTimeMs || 0,
          driver: data.driver || 'Marine SQL Engine',
        });
      }
    } catch (err: any) {
      setSqlError(err.message || 'Failed to execute query');
      setSqlResult(null);
    } finally {
      setSqlRunning(false);
    }
  };

  // Sync current boat GPS with boat_current_locations
  const handleSyncBoatGps = async () => {
    if (!currentBoat) return;
    try {
      setIsSyncingWithBoat(true);
      setSyncFeedback(null);

      // speed in knots to meters/sec (1 knot = 0.514444 m/s)
      const speedMps = (currentBoat.sog || 0) * 0.514444;
      const batteryPercent = currentBoat.batteryVolts 
        ? Math.min(100, Math.round(((currentBoat.batteryVolts - 11.5) / 1.5) * 100)) 
        : 85;

      const res = await fetch('/api/marine-db/boat-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boatId: 'b1eecc88-8b0a-3de7-aa5c-5aa8ac270b22',
          boatName: currentBoat.name,
          deviceId: 'd111cc88-8b0a-3de7-aa5c-5aa8ac270333',
          latitude: currentBoat.lat,
          longitude: currentBoat.lng,
          speedMps: speedMps,
          courseDegrees: currentBoat.cog || 0,
          headingDegrees: currentBoat.cog || 0,
          source: 'ESP32_GPS',
          batteryLevel: batteryPercent,
          alertStatus: currentAlert?.level,
          distanceMeters: currentAlert ? currentAlert.distanceMeters : 1200,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSyncFeedback(`✅ GPS Synced: (${currentBoat.lat.toFixed(4)}, ${currentBoat.lng.toFixed(4)}) at ${(currentBoat.sog || 0).toFixed(1)} kts recorded into marineproject.boat_current_locations!`);
        fetchDbStatus();
        if (selectedTable === 'boat_current_locations' || selectedTable === 'boat_locations') {
          fetchTableRows(selectedTable);
        }
      }
    } catch (err: any) {
      setSyncFeedback(`⚠️ Sync failed: ${err.message}`);
    } finally {
      setIsSyncingWithBoat(false);
    }
  };

  // Test custom PostgreSQL connection
  const handleConnectRemoteDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connString.trim()) return;

    try {
      setConnecting(true);
      setConnectionMessage(null);

      const res = await fetch('/api/marine-db/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connString.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setConnectionMessage({ text: `🎉 ${data.message}` });
        fetchDbStatus();
        fetchTableRows(selectedTable);
      } else {
        setConnectionMessage({ text: `❌ ${data.message}`, isError: true });
      }
    } catch (err: any) {
      setConnectionMessage({ text: `❌ Error: ${err.message}`, isError: true });
    } finally {
      setConnecting(false);
    }
  };

  // Reset seed
  const handleResetSeed = async () => {
    if (!confirm('Are you sure you want to reset all 13 tables to initial default seed values?')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/marine-db/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('All 13 tables reset to initial seeds successfully!');
        fetchDbStatus();
        fetchTableRows(selectedTable);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredRows = tableData.filter((row) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(term));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-cyan-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
              <Database className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Marine Project PostgreSQL Database
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Connected: Schema <code className="font-mono text-cyan-300">marineproject</code>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                13 Tables • PostGIS Spatial Points & Polygons • Active Live Sync with Vessel Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Live GPS Sync button */}
            {currentBoat && (
              <button
                onClick={handleSyncBoatGps}
                disabled={isSyncingWithBoat}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-all"
                title="Write current boat location and speed into boat_current_locations"
              >
                <Radio className={`w-3.5 h-3.5 ${isSyncingWithBoat ? 'animate-spin' : ''}`} />
                {isSyncingWithBoat ? 'Syncing...' : 'Sync GPS to DB'}
              </button>
            )}

            {/* Download SQL */}
            <a
              href="/api/marine-db/export-sql"
              download="marineproject_schema.sql"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all"
              title="Download full SQL file with 13 tables and seed data"
            >
              <Download className="w-3.5 h-3.5" />
              Download .sql
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
            <span>{syncFeedback}</span>
            <button onClick={() => setSyncFeedback(null)} className="text-emerald-400 hover:text-white ml-2">×</button>
          </div>
        )}

        {/* Sub Navigation Bar */}
        <div className="px-5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveView('TABLES')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                activeView === 'TABLES'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              13 Tables Browser ({dbStatus?.totalRecords || 39} Rows)
            </button>

            <button
              onClick={() => setActiveView('SQL_CONSOLE')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                activeView === 'SQL_CONSOLE'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              SQL Query Console
            </button>

            <button
              onClick={() => setActiveView('SETTINGS')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                activeView === 'SETTINGS'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Live PostgreSQL Connection
            </button>

            <button
              onClick={() => setActiveView('DOCS')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                activeView === 'DOCS'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              REST API Endpoints
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline font-mono">
              Driver: <strong className="text-cyan-400">{dbStatus?.driver || 'ACTIVE_RELATIONAL_ENGINE'}</strong>
            </span>
            <button
              onClick={() => {
                fetchDbStatus();
                fetchTableRows(selectedTable);
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* VIEW 1: TABLE BROWSER */}
          {activeView === 'TABLES' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Sidebar with 13 tables */}
              <div className="w-full md:w-72 bg-slate-950/80 border-r border-slate-800/80 p-3 flex flex-col gap-1 overflow-y-auto">
                <div className="px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                  Schema: marineproject
                </div>
                {dbStatus?.tables.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setSelectedTable(t.name);
                      setSearchFilter('');
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                      selectedTable === t.name
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {TABLE_ICONS[t.name] || <Table className="w-4 h-4 text-slate-400" />}
                      <span className="truncate">{t.name}</span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-400 font-mono">
                      {t.count}
                    </span>
                  </button>
                ))}

                <div className="mt-auto pt-3 border-t border-slate-800">
                  <button
                    onClick={handleResetSeed}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-slate-800 transition-colors"
                  >
                    Reset Default Seed Data
                  </button>
                </div>
              </div>

              {/* Table Data View */}
              <div className="flex-1 flex flex-col bg-slate-900/50 overflow-hidden">
                {/* Table Header & Search */}
                <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-cyan-400">marineproject.{selectedTable}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({tableData.length} records, {tableColumns.length} columns)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {dbStatus?.tables.find((t) => t.name === selectedTable)?.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={`Filter ${selectedTable}...`}
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Grid */}
                <div className="flex-1 overflow-auto p-4">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      Loading records from marineproject.{selectedTable}...
                    </div>
                  ) : filteredRows.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-8 text-center">
                      <Table className="w-8 h-8 mb-2 opacity-50" />
                      No records found in {selectedTable} matching filter.
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner bg-slate-950/60">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                            {tableColumns.map((col) => (
                              <th key={col} className="px-3.5 py-2.5 font-semibold font-mono tracking-wider">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-cyan-950/20 transition-colors">
                              {tableColumns.map((col) => {
                                const val = row[col];
                                return (
                                  <td key={col} className="px-3.5 py-2 text-slate-300 font-mono text-[11px] max-w-xs truncate">
                                    {val === null || val === undefined ? (
                                      <span className="text-slate-600 italic">null</span>
                                    ) : typeof val === 'boolean' ? (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${val ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                                        {String(val)}
                                      </span>
                                    ) : col.includes('status') || col.includes('role') || col.includes('event_type') ? (
                                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold">
                                        {String(val)}
                                      </span>
                                    ) : col.includes('point') || col.includes('geometry') ? (
                                      <span className="text-purple-400 truncate block max-w-[200px]" title={String(val)}>
                                        {String(val)}
                                      </span>
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: SQL QUERY CONSOLE */}
          {activeView === 'SQL_CONSOLE' && (
            <div className="flex-1 flex flex-col p-4 bg-slate-950/70 overflow-hidden">
              {/* Quick Sample Queries */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Sample Queries:</span>
                {[
                  `SELECT * FROM users;`,
                  `SELECT * FROM boats;`,
                  `SELECT * FROM devices;`,
                  `SELECT * FROM boat_current_locations;`,
                  `SELECT * FROM sos_events;`,
                  `SELECT tablename FROM pg_tables WHERE schemaname = 'marineproject';`,
                  `SELECT * FROM maritime_boundaries;`,
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setCustomSql(q);
                      handleExecuteSql(q);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 hover:border-cyan-500 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* SQL Text Area & Execute */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <textarea
                    value={customSql}
                    onChange={(e) => setCustomSql(e.target.value)}
                    rows={3}
                    className="w-full p-3 font-mono text-xs bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter PostgreSQL query (e.g., SELECT * FROM users;)"
                  />
                </div>
                <button
                  onClick={() => handleExecuteSql()}
                  disabled={sqlRunning}
                  className="px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-slate-950 flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-current ${sqlRunning ? 'animate-spin' : ''}`} />
                  Run
                </button>
              </div>

              {/* Error Message */}
              {sqlError && (
                <div className="p-3 mb-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{sqlError}</span>
                </div>
              )}

              {/* SQL Results */}
              <div className="flex-1 overflow-auto bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {sqlResult ? `${sqlResult.rowCount} rows returned in ${sqlResult.executionTimeMs} ms` : 'Query Output'}
                    </span>
                  </div>
                  {sqlResult && (
                    <span className="font-mono text-cyan-400 text-[11px]">{sqlResult.driver}</span>
                  )}
                </div>

                <div className="flex-1 overflow-auto">
                  {sqlResult && sqlResult.rows.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                          {sqlResult.columns.map((col) => (
                            <th key={col} className="px-3 py-2 font-mono text-[11px] font-semibold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {sqlResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-cyan-950/30">
                            {sqlResult.columns.map((col) => (
                              <td key={col} className="px-3 py-2 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                                {row[col] === null ? <span className="text-slate-600">null</span> : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Run any SQL query to view result grid.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: LIVE POSTGRESQL CONNECTION */}
          {activeView === 'SETTINGS' && (
            <div className="flex-1 p-6 bg-slate-950/70 overflow-y-auto max-w-3xl mx-auto">
              <div className="mb-6">
                <h3 className="text-base font-bold text-white mb-1">Connect to External PostgreSQL Database</h3>
                <p className="text-xs text-slate-400">
                  You can connect this app directly to any external live PostgreSQL instance (Supabase, Neon, Cloud SQL, AWS RDS, or localhost). The app will automatically mount and verify all 13 tables under <code className="text-cyan-400 font-mono">marineproject</code>.
                </p>
              </div>

              <form onSubmit={handleConnectRemoteDb} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    PostgreSQL Connection String (URI):
                  </label>
                  <input
                    type="text"
                    value={connString}
                    onChange={(e) => setConnString(e.target.value)}
                    placeholder="postgresql://user:password@host:5432/dbname?sslmode=require"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Example: <code className="text-slate-400">postgresql://postgres:mysecret@localhost:5432/marineproject</code>
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={connecting || !connString.trim()}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-cyan-950 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
                    {connecting ? 'Testing Connection...' : 'Test & Connect Database'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnString('postgresql://postgres:postgres@localhost:5432/marineproject')}
                    className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Use Localhost Sample
                  </button>
                </div>

                {connectionMessage && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      connectionMessage.isError
                        ? 'bg-red-950/60 border-red-800 text-red-300'
                        : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {connectionMessage.isError ? (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    )}
                    <span>{connectionMessage.text}</span>
                  </div>
                )}
              </form>

              {/* Current Active Mode */}
              <div className="mt-8 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                <div className="font-semibold text-white">Current Running Configuration:</div>
                <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono text-[11px]">
                  <div>Status: <span className="text-emerald-400">ACTIVE & READY</span></div>
                  <div>Driver: <span className="text-cyan-400">{dbStatus?.driver}</span></div>
                  <div>Database Name: <span className="text-slate-300">{dbStatus?.database}</span></div>
                  <div>Schema: <span className="text-slate-300">{dbStatus?.schema}</span></div>
                  <div>Total 13 Tables: <span className="text-cyan-400">{dbStatus?.totalTables} tables initialized</span></div>
                  <div>Total Rows: <span className="text-emerald-400">{dbStatus?.totalRecords} seed records</span></div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: API ENDPOINTS DOCS */}
          {activeView === 'DOCS' && (
            <div className="flex-1 p-6 bg-slate-950/70 overflow-y-auto max-w-4xl mx-auto space-y-4">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Live Database REST API Endpoints</h3>
                <p className="text-xs text-slate-400">
                  These REST APIs are mounted on the backend so your mobile app, frontend components, and ESP32 hardware can seamlessly read and write to all 13 tables.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {[
                  {
                    method: 'GET',
                    url: '/api/marine-db/status',
                    desc: 'Get full database health, driver, and 13 tables summary',
                  },
                  {
                    method: 'GET',
                    url: '/api/marine-db/tables',
                    desc: 'List metadata, column schemas, and row counts of all 13 tables',
                  },
                  {
                    method: 'GET',
                    url: '/api/marine-db/tables/:tableName',
                    desc: 'Fetch rows for any table (e.g. /api/marine-db/tables/users or /boats)',
                  },
                  {
                    method: 'POST',
                    url: '/api/marine-db/tables/:tableName',
                    desc: 'Insert new row into any table with schema validation',
                  },
                  {
                    method: 'POST',
                    url: '/api/marine-db/query',
                    desc: 'Execute arbitrary SQL query (e.g. {"sql": "SELECT * FROM boats"})',
                  },
                  {
                    method: 'POST',
                    url: '/api/marine-db/boat-sync',
                    desc: 'Sync live boat GPS & ESP32 telemetry (updates boat_current_locations & devices)',
                  },
                  {
                    method: 'POST',
                    url: '/api/marine-db/sos-sync',
                    desc: 'Trigger SOS emergency alert (inserts to sos_events & notifications)',
                  },
                  {
                    method: 'GET',
                    url: '/api/marine-db/export-sql',
                    desc: 'Download marineproject_schema.sql file with all DDL & DML statements',
                  },
                ].map((ep) => (
                  <div key={ep.url} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'GET' ? 'bg-sky-950 text-sky-400' : 'bg-emerald-950 text-emerald-400'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="text-cyan-300 font-bold">{ep.url}</span>
                    </div>
                    <div className="text-slate-400 text-[11px] font-sans pl-1">
                      {ep.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Connected Database: <strong className="text-cyan-400">marineproject</strong> (PostGIS Point/MultiPolygon Geometries Supported)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
