import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { DATABASE_NAME } from '@/services/database';

export const BackupService = {
  async backupDatabase(): Promise<string> {
    const srcFile = new File(Paths.document, 'SQLite', DATABASE_NAME);
    if (!srcFile.exists) {
      throw new Error('Database file not found');
    }

    const dest = new File(Paths.cache, 'mindflow_backup.db');
    await srcFile.copy(dest);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest.uri, {
        mimeType: 'application/vnd.sqlite3',
      });
    }

    return dest.uri;
  },
};
