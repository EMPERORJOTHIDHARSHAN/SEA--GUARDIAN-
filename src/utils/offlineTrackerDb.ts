/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OfflineTelemetryPoint, OfflineStoreStats, BoatState } from '../types/marine';

const DB_NAME = 'MaritimeSafetyOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'telemetry_logs';
const LS_FALLBACK_KEY = 'maritime_offline_telemetry_v1';

let idbInstance: IDBDatabase | null = null;

/**
 * Initializes IndexedDB with automatic upgrade and index creation.
 */
export async function initOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (idbInstance) return idbInstance;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'uuid' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('recordedAt', 'recordedAt', { unique: false });
          store.createIndex('boatRegNo', 'boatRegNo', { unique: false });
        }
      };

      request.onsuccess = (event: Event) => {
        idbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(idbInstance);
      };

      request.onerror = () => {
        console.warn('⚠️ IndexedDB open error, falling back to LocalStorage store.');
        resolve(null);
      };
    } catch (err) {
      console.warn('⚠️ IndexedDB exception, falling back to LocalStorage store:', err);
      resolve(null);
    }
  });
}

// ================= LocalStorage Fallbacks =================

function getLsPoints(): OfflineTelemetryPoint[] {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLsPoints(points: OfflineTelemetryPoint[]): void {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(points));
  } catch (err) {
    console.warn('Failed to write to localStorage:', err);
  }
}

// ================= Core Database Operations =================

/**
 * Stores a GNSS location point offline in local DB.
 */
export async function saveOfflinePoint(point: OfflineTelemetryPoint): Promise<void> {
  const db = await initOfflineDb();

  if (!point.uuid) {
    point.uuid = `pt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  if (db) {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(point);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        // Fallback to localStorage if transaction fails
        const list = getLsPoints();
        const idx = list.findIndex((p) => p.uuid === point.uuid);
        if (idx >= 0) list[idx] = point;
        else list.push(point);
        saveLsPoints(list);
        resolve();
      }
    });
  } else {
    const list = getLsPoints();
    const idx = list.findIndex((p) => p.uuid === point.uuid);
    if (idx >= 0) list[idx] = point;
    else list.push(point);
    saveLsPoints(list);
  }
}

/**
 * Retrieves all pending points waiting to be forwarded to Cloud DB.
 */
export async function getPendingPoints(boatRegNo?: string): Promise<OfflineTelemetryPoint[]> {
  const all = await getAllPoints(boatRegNo);
  return all.filter((p) => !p.synced);
}

/**
 * Retrieves all stored voyage track points (both offline and synced).
 */
export async function getAllPoints(boatRegNo?: string): Promise<OfflineTelemetryPoint[]> {
  const db = await initOfflineDb();

  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          let results: OfflineTelemetryPoint[] = request.result || [];
          if (boatRegNo) {
            results = results.filter((p) => p.boatRegNo === boatRegNo);
          }
          // Sort chronologically ascending
          results.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
          resolve(results);
        };

        request.onerror = () => {
          const ls = getLsPoints();
          resolve(boatRegNo ? ls.filter((p) => p.boatRegNo === boatRegNo) : ls);
        };
      } catch {
        const ls = getLsPoints();
        resolve(boatRegNo ? ls.filter((p) => p.boatRegNo === boatRegNo) : ls);
      }
    });
  } else {
    const ls = getLsPoints();
    return boatRegNo ? ls.filter((p) => p.boatRegNo === boatRegNo) : ls;
  }
}

/**
 * Marks a batch of points as successfully pushed / forwarded to Cloud DB.
 */
export async function markPointsSynced(uuids: string[], syncedAt: string = new Date().toISOString()): Promise<void> {
  const db = await initOfflineDb();

  if (db) {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        let completed = 0;
        if (uuids.length === 0) {
          resolve();
          return;
        }

        uuids.forEach((uuid) => {
          const req = store.get(uuid);
          req.onsuccess = () => {
            const point = req.result as OfflineTelemetryPoint | undefined;
            if (point) {
              point.synced = true;
              point.syncedAt = syncedAt;
              store.put(point);
            }
            completed++;
            if (completed === uuids.length) {
              resolve();
            }
          };
          req.onerror = () => {
            completed++;
            if (completed === uuids.length) resolve();
          };
        });

        tx.onerror = () => reject(tx.error);
      } catch {
        const list = getLsPoints();
        const set = new Set(uuids);
        list.forEach((p) => {
          if (set.has(p.uuid)) {
            p.synced = true;
            p.syncedAt = syncedAt;
          }
        });
        saveLsPoints(list);
        resolve();
      }
    });
  } else {
    const list = getLsPoints();
    const set = new Set(uuids);
    list.forEach((p) => {
      if (set.has(p.uuid)) {
        p.synced = true;
        p.syncedAt = syncedAt;
      }
    });
    saveLsPoints(list);
  }
}

/**
 * Clears all points from local DB (for resetting voyage or clearing memory).
 */
export async function clearAllPoints(boatRegNo?: string): Promise<void> {
  const db = await initOfflineDb();

  if (db && !boatRegNo) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => {
          saveLsPoints([]);
          resolve();
        };
      } catch {
        saveLsPoints([]);
        resolve();
      }
    });
  } else {
    saveLsPoints([]);
  }
}

/**
 * Calculates current storage and synchronization statistics.
 */
export async function getStoreStats(): Promise<OfflineStoreStats> {
  const points = await getAllPoints();
  const unsynced = points.filter((p) => !p.synced);
  const synced = points.filter((p) => p.synced);

  const lastPoint = points.length > 0 ? points[points.length - 1] : undefined;
  const lastSyncedPoint = synced.length > 0 ? synced[synced.length - 1] : undefined;

  return {
    totalStoredCount: points.length,
    unsyncedCount: unsynced.length,
    syncedCount: synced.length,
    lastRecordTime: lastPoint?.recordedAt,
    lastSyncTime: lastSyncedPoint?.syncedAt,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    storageType: idbInstance ? 'INDEXED_DB' : 'LOCAL_STORAGE',
  };
}

/**
 * Generates an 8-hour authentic sea voyage path from Rameswaram harbor to fishing banks and back.
 * Perfectly demonstrates the "Store and Forward" offline tracking capability.
 */
export async function generateSampleVoyageHistory(boat: BoatState): Promise<OfflineTelemetryPoint[]> {
  const now = Date.now();
  // 12 points spaced 30 minutes apart (6 hours of sea voyage)
  const waypoints = [
    { offsetH: 6.0, lat: 9.2882, lng: 79.3135, speed: 0.0, cog: 85, alert: 'SAFE', note: 'Departed Rameswaram Fishing Jetty' },
    { offsetH: 5.5, lat: 9.2950, lng: 79.3380, speed: 7.8, cog: 80, alert: 'SAFE', note: 'Passing Pamban Shoals' },
    { offsetH: 5.0, lat: 9.3080, lng: 79.3750, speed: 8.4, cog: 75, alert: 'SAFE', note: 'Deep sea outbound course' },
    { offsetH: 4.5, lat: 9.3240, lng: 79.4200, speed: 8.1, cog: 70, alert: 'SAFE', note: 'Entering Palk Bay fishing bank' },
    { offsetH: 4.0, lat: 9.3450, lng: 79.4620, speed: 3.2, cog: 45, alert: 'SAFE', note: 'Net casting & Trawling operation' },
    { offsetH: 3.5, lat: 9.3580, lng: 79.4890, speed: 3.5, cog: 60, alert: 'SAFE', note: 'Rich fish shoal trawling' },
    { offsetH: 3.0, lat: 9.3620, lng: 79.5020, speed: 4.0, cog: 95, alert: 'YELLOW', note: 'Yellow Zone approach near Katchatheevu' },
    { offsetH: 2.5, lat: 9.3550, lng: 79.4850, speed: 7.2, cog: 245, alert: 'SAFE', note: 'Tacking West towards safe Indian waters' },
    { offsetH: 2.0, lat: 9.3400, lng: 79.4400, speed: 8.5, cog: 240, alert: 'SAFE', note: 'Returning homeward passage' },
    { offsetH: 1.5, lat: 9.3200, lng: 79.3900, speed: 8.6, cog: 245, alert: 'SAFE', note: 'Midway transit' },
    { offsetH: 1.0, lat: 9.3000, lng: 79.3450, speed: 7.5, cog: 250, alert: 'SAFE', note: 'Approaching coastal waters' },
    { offsetH: 0.2, lat: boat.lat, lng: boat.lng, speed: boat.sog, cog: boat.cog, alert: 'SAFE', note: 'Current vessel location' },
  ];

  const generatedPoints: OfflineTelemetryPoint[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const timestamp = new Date(now - wp.offsetH * 3600 * 1000).toISOString();
    // Simulate first 7 points as already synced, last 5 as offline unsynced points waiting for shore network!
    const isSynced = i < 7;

    const pt: OfflineTelemetryPoint = {
      uuid: `sample_${i}_${Date.now()}`,
      boatId: boat.id,
      boatRegNo: boat.regNumber,
      boatName: boat.name,
      lat: wp.lat,
      lng: wp.lng,
      sog: wp.speed,
      cog: wp.cog,
      batteryPercent: Math.max(45, 100 - i * 4),
      alertLevel: wp.alert as any,
      distanceToBorderNm: Number((Math.abs(79.511 - wp.lng) * 60).toFixed(2)),
      recordedAt: timestamp,
      synced: isSynced,
      syncedAt: isSynced ? new Date(now - 1.5 * 3600 * 1000).toISOString() : undefined,
      source: 'OFFLINE_GNSS_STORE',
    };

    await saveOfflinePoint(pt);
    generatedPoints.push(pt);
  }

  return generatedPoints;
}
