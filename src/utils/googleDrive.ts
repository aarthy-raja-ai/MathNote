import * as FileSystem from 'expo-file-system/legacy';
import storage from './storage';

/**
 * Google Drive REST API Utility for MathNote
 * 
 * This utility handles:
 * 1. Uploading the app backup to Google Drive
 * 2. Downloading the app backup from Google Drive
 * 3. Searching for existing backups in the App Data folder
 */

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveBackup {
    id: string;
    name: string;
    modifiedTime: string;
}

class GoogleDriveService {
    /**
     * Uploads the current local data to Google Drive
     * Uses the 'appDataFolder' space for privacy (not visible to the user in their Drive)
     */
    async uploadBackup(accessToken: string): Promise<boolean> {
        try {
            const data = await storage.exportAllData();
            const jsonData = JSON.stringify(data);
            const fileName = 'mathnote_cloud_backup.json';

            // 1. Check if file already exists in appDataFolder
            const existingFileId = await this.findBackupFile(accessToken);

            let url = DRIVE_UPLOAD_URL + '?uploadType=multipart';
            let method = 'POST';

            if (existingFileId) {
                // Update existing file
                url = `${DRIVE_UPLOAD_URL}/${existingFileId}?uploadType=multipart`;
                method = 'PATCH';
            }

            const boundary = 'foo_bar_baz';
            const metadata = {
                name: fileName,
                parents: existingFileId ? undefined : ['appDataFolder'],
                mimeType: 'application/json',
            };

            const body = `--${boundary}\r\n` +
                `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                `${JSON.stringify(metadata)}\r\n` +
                `--${boundary}\r\n` +
                `Content-Type: application/json\r\n\r\n` +
                `${jsonData}\r\n` +
                `--${boundary}--`;

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body,
            });

            return response.ok;
        } catch (error) {
            console.error('Drive upload error:', error);
            return false;
        }
    }

    /**
     * Downloads the backup from Google Drive and restores it locally
     */
    async downloadAndRestore(accessToken: string): Promise<boolean> {
        try {
            const fileId = await this.findBackupFile(accessToken);
            if (!fileId) return false;

            const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) return false;

            const data = await response.json();
            return await storage.importAllData(data);
        } catch (error) {
            console.error('Drive restore error:', error);
            return false;
        }
    }

    /**
     * Finds the backup file in the appDataFolder space
     */
    async findBackupFile(accessToken: string): Promise<string | null> {
        const query = encodeURIComponent("name = 'mathnote_cloud_backup.json' and trashed = false");
        const url = `${DRIVE_API_URL}?q=${query}&spaces=appDataFolder&fields=files(id, name, modifiedTime)`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        return null;
    }

    /**
     * Gets details about the latest cloud backup
     */
    async getBackupInfo(accessToken: string): Promise<DriveBackup | null> {
        const query = encodeURIComponent("name = 'mathnote_cloud_backup.json' and trashed = false");
        const url = `${DRIVE_API_URL}?q=${query}&spaces=appDataFolder&fields=files(id, name, modifiedTime)`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0];
        }
        return null;
    }
}

export const googleDriveService = new GoogleDriveService();
export default googleDriveService;
