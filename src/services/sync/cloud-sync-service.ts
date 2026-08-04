import { Directory, File, Paths } from 'expo-file-system';
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

const DB_FILE = new File(Paths.document, 'SQLite', 'mindflow.db');
const BACKUP_DIR = new Directory(Paths.cache, 'backups');

async function ensureBackupDir(): Promise<void> {
  if (!BACKUP_DIR.exists) {
    BACKUP_DIR.create({ intermediates: true, idempotent: true });
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
      const backupFile = new File(BACKUP_DIR, `mindflow-backup-${timestamp}.db`);
      await DB_FILE.copy(backupFile, { overwrite: true });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupFile.uri);
      }
      return backupFile.uri;
    } catch {
      return null;
    }
  },

  async backupToDrive(db: SQLiteDatabase): Promise<boolean> {
    throw new Error('Google Drive backup is not yet implemented');
  },

  async restoreFromDrive(db: SQLiteDatabase, phrase: string): Promise<boolean> {
    throw new Error('Google Drive restore is not yet implemented');
  },

  async authenticateWithGoogle(db: SQLiteDatabase): Promise<boolean> {
    throw new Error('Google Drive authentication is not yet implemented');
  },

  async signOutFromGoogle(db: SQLiteDatabase): Promise<void> {
    await this.saveState(db, { isAuthenticated: false, googleDriveFileId: null });
  },

  async setBackupInterval(db: SQLiteDatabase, interval: BackupInterval): Promise<void> {
    if (interval !== 'manual') {
      throw new Error('Automatic backup scheduling is not yet implemented');
    }
    await this.saveState(db, { interval });
  },
};
