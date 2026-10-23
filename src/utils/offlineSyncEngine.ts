/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BoatState, OfflineTelemetryPoint, OfflineStoreStats } from '../types/marine';
import { 
  saveOfflinePoint, 
  getPendingPoints, 
  getAllPoints, 
  markPointsSynced, 
  getStoreStats 
} from './offlineTrackerDb';

export interface SyncEngineStatus {
  isSimulatedOffline: boolean;
  effectiveOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  totalCount: number;
  lastSyncResult?: {
    success: boolean;
    count: number;
    timestamp: string;
    message: string;
  };
}

type StatusListener = (status: SyncEngineStatus) => void;

class OfflineSyncEngine {
  private simulatedOffline = false;
  private isSyncing = false;
  private listeners: Set<StatusListener> = new Set();
  private lastResult?: SyncEngineStatus['lastSyncResult'];
  private trackingIntervalId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange());
      window.addEventListener('offline', () => this.handleNetworkChange());
    }
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  public isOnline(): boolean {
    if (this.simulatedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public setSimulatedOffline(offline: boolean) {
    this.simulatedOffline = offline;
    this.notify();

    // If switched back online, automatically trigger background sync!
    if (!offline && this.isOnline()) {
      this.triggerBackgroundSync();
    }
  }

  public getSimulatedOffline(): boolean {
    return this.simulatedOffline;
  }

  private async notify() {
    const stats = await getStoreStats();
    const status: SyncEngineStatus = {
      isSimulatedOffline: this.simulatedOffline,
      effectiveOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      pendingCount: stats.unsyncedCount,
      syncedCount: stats.syncedCount,
      totalCount: stats.totalStoredCount,
      lastSyncResult: this.lastResult,
    };
    this.listeners.forEach((fn) => fn(status));
  }

  private handleNetworkChange() {
    this.notify();
    if (this.isOnline()) {
      this.triggerBackgroundSync();
    }
  }

  /**
   * Records current boat position offline (simulating GNSS fix in deep sea).
   */
  public async recordCurrentPosition(boat: BoatState, alertLevel: string = 'SAFE'): Promise<OfflineTelemetryPoint> {
    const pt: OfflineTelemetryPoint = {
      uuid: `gnss_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      boatId: boat.id,
      boatRegNo: boat.regNumber,
      boatName: boat.name,
      lat: boat.lat,
      lng: boat.lng,
      sog: boat.sog,
      cog: boat.cog,
      batteryPercent: Math.round((boat.batteryVolts / 13.8) * 100),
      alertLevel: alertLevel as any,
      distanceToBorderNm: Number((Math.abs(79.511 - boat.lng) * 60).toFixed(2)),
      recordedAt: new Date().toISOString(),
      synced: false, // stored locally
      source: 'OFFLINE_GNSS_STORE',
    };

    await saveOfflinePoint(pt);
    await this.notify();

    // If device happens to be online right now, forward it
    if (this.isOnline()) {
      this.triggerBackgroundSync();
    }

    return pt;
  }

  /**
   * Pushes all pending offline points to Cloud DB when network is available.
   */
  public async triggerBackgroundSync(): Promise<{ success: boolean; count: number; message: string }> {
    if (!this.isOnline()) {
      const msg = 'இணைய இணைப்பு இல்லை (Offline). கரைக்கு திரும்பியவுடன் தானாக பதிவேற்றப்படும்.';
      return { success: false, count: 0, message: msg };
    }

    if (this.isSyncing) {
      return { success: true, count: 0, message: 'Sync already in progress...' };
    }

    try {
      this.isSyncing = true;
      this.notify();

      const pending = await getPendingPoints();
      if (pending.length === 0) {
        this.isSyncing = false;
        this.notify();
        return { success: true, count: 0, message: 'அனைத்து புள்ளிகளும் ஏற்கனவே கிளவுடில் சேமிக்கப்பட்டுள்ளன.' };
      }

      // Send to server
      const response = await fetch('/api/telemetry/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boatRegNo: pending[0]?.boatRegNo || 'IND-TN-10-MM-4421',
          boatName: pending[0]?.boatName || 'Veera Maravan',
          points: pending,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const uuids = pending.map((p) => p.uuid);
        await markPointsSynced(uuids, data.forwardedAt || new Date().toISOString());

        this.lastResult = {
          success: true,
          count: pending.length,
          timestamp: new Date().toLocaleTimeString(),
          message: `வெற்றி: ${pending.length} ஆஃப்லைன் புள்ளிகள் கிளவுட் டேட்டாபேஸுக்கு மாற்றப்பட்டன!`,
        };
        await this.notify();
        return { success: true, count: pending.length, message: this.lastResult.message };
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (err: any) {
      this.lastResult = {
        success: false,
        count: 0,
        timestamp: new Date().toLocaleTimeString(),
        message: `Sync failed: ${err.message}`,
      };
      await this.notify();
      return { success: false, count: 0, message: err.message };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
