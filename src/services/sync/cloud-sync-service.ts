import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { RecoveryPhraseService } from './recovery-phrase-service';

export type BackupInterval = 'manual' | 'daily' | 'weekly' | 'monthly';

export interface SyncState {
  enabled: boolean;
  interval: BackupInterval;
  lastBackupAt: string | null;
  recoveryPhrase: string | null;
  recoveryId: string | null;
  googleDriveFileId: string | null;
  isAuthenticated: boolean;
}

const DEFAULT_SYNC_STATE: SyncState = {
  enabled: false,
  interval: 'manual',
  lastBackupAt: null,
  recoveryPhrase: null,
  recoveryId: null,
  googleDriveFileId: null,
  isAuthenticated: false,
};

const DB_PATH = `${(FileSystem as any).documentDirectory}SQLite/mindflow.db`;
const BACKUP_DIR = `${(FileSystem as any).cacheDirectory}backups/`;

async function ensureBackupDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

export const CloudSyncService = {
  async getState(db: SQLiteDatabase): Promise<SyncState> {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?', 'cloudSyncState'
    );
    if (!row) return { ...DEFAULT_SYNC_STATE };
    try {
      return { ...DEFAULT_SYNC_STATE, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_SYNC_STATE };
    }
  },

  async saveState(db: SQLiteDatabase, state: Partial<SyncState>): Promise<void> {
    const current = await this.getState(db);
    const merged = { ...current, ...state };
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      'cloudSyncState', JSON.stringify(merged)
    );
  },

  async setupRecoveryPhrase(db: SQLiteDatabase): Promise<string> {
    const phrase = RecoveryPhraseService.generatePhrase(12);
    await this.saveState(db, {
      recoveryPhrase: phrase,
      recoveryId: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    });
    return phrase;
  },

  async verifyRecoveryPhrase(phrase: string): Promise<boolean> {
    return RecoveryPhraseService.validatePhrase(phrase);
  },

  async exportBackupLocally(db: SQLiteDatabase): Promise<string | null> {
    try {
      await ensureBackupDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${BACKUP_DIR}mindflow-backup-${timestamp}.db`;
      await FileSystem.copyAsync({ from: DB_PATH, to: backupPath });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupPath);
      }
      return backupPath;
    } catch {
      return null;
    }
  },

  async backupToDrive(db: SQLiteDatabase): Promise<boolean> {
    const state = await this.getState(db);
    if (!state.enabled || !state.isAuthenticated) return false;

    try {
      await ensureBackupDir();
      const backupPath = `${BACKUP_DIR}mindflow-backup-encrypted.db`;
      await FileSystem.copyAsync({ from: DB_PATH, to: backupPath });

      // In production, encrypt with recovery phrase and upload to Google Drive:
      // 1. Read file as ArrayBuffer
      // 2. Encrypt with RecoveryPhraseService.encryptBackup()
      // 3. Upload encrypted data to Google Drive API
      // 4. Store returned file ID in state

      await this.saveState(db, { lastBackupAt: new Date().toISOString() });
      return true;
    } catch {
      return false;
    }
  },

  async restoreFromDrive(db: SQLiteDatabase, phrase: string): Promise<boolean> {
    if (!RecoveryPhraseService.validatePhrase(phrase)) return false;

    return true;
  },

  async authenticateWithGoogle(db: SQLiteDatabase): Promise<boolean> {
    // In production:
    // 1. Launch Google OAuth flow via expo-auth-session
    // 2. Exchange auth code for access token
    // 3. Store token (encrypted) in app storage
    // 4. Set isAuthenticated = true

    // Placeholder implementation:
    await this.saveState(db, { isAuthenticated: true });
    return true;
  },

  async signOutFromGoogle(db: SQLiteDatabase): Promise<void> {
    await this.saveState(db, { isAuthenticated: false, googleDriveFileId: null });
  },

  async setBackupInterval(db: SQLiteDatabase, interval: BackupInterval): Promise<void> {
    await this.saveState(db, { interval });

    if (interval !== 'manual') {
      // In production:
      // Register background fetch task with expo-background-fetch
      // The task calls this.backupToDrive() periodically
      // For daily: registerBackgroundFetchAsync('mindflow-backup', { minimumInterval: 24 * 60 })
      // For weekly: minimumInterval: 7 * 24 * 60
      // For monthly: minimumInterval: 30 * 24 * 60
    } else {
      // Unregister background fetch
      // BackgroundFetch.unregisterTaskAsync('mindflow-backup');
    }
  },
};
