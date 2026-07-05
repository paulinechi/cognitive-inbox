import { API_URL } from '../config/api';
import { authFetch, authHeaders } from './http';
import { getCurrentLanguage } from '../i18n/current';
import { uploadAsync } from 'expo-file-system/legacy';

/**
 * Captures a thought (text, audio, or image) and sends it to the backend for processing.
 * 
 * @param {string | Object} input - Either a text string or an object with {type, uri}
 * @param {string[]} tags - Available custom tags for categorization
 * @returns {Promise<Object>} Processed memo object
 * @throws {Error} If the request fails or input is invalid
 */
export const captureThought = async (input, tags = []) => {
    try {
        // Case 1: Text Input (Use standard fetch)
        if (typeof input === 'string') {
            const formData = new FormData();
            formData.append('available_tags', JSON.stringify(tags));
            formData.append('preferred_language', getCurrentLanguage());
            formData.append('text', input);

            const response = await authFetch(`${API_URL}/memos/capture`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            return await response.json();
        }

        // Case 2: File Input (Use FileSystem.uploadAsync for better Android stability)
        if (input?.type === 'audio' || input?.type === 'image') {
            const uri = input.uri;
            const fileType = input.type === 'audio' ? 'audio/mp4' : `image/${uri.split('.').pop()}`;
            const fileName = input.type === 'audio' ? 'recording.m4a' : `photo.${uri.split('.').pop()}`;

            const uploadResult = await uploadAsync(`${API_URL}/memos/capture`, uri, {
                fieldName: 'file',
                httpMethod: 'POST',
                uploadType: 1, // FileSystem.FileSystemUploadType.MULTIPART = 1
                mimeType: fileType,
                headers: authHeaders(),
                parameters: {
                    'available_tags': JSON.stringify(tags),
                    'preferred_language': getCurrentLanguage()
                }
            });

            if (uploadResult.status !== 200) {
                throw new Error(`Server error: ${uploadResult.status} - ${uploadResult.body}`);
            }

            return JSON.parse(uploadResult.body);
        }

        throw new Error('Invalid input: must be a string or object with type and uri');

    } catch (error) {
        console.error("Capture failed:", error);
        throw new Error(`Failed to capture thought: ${error.message}`);
    }
};

/**
 * Retrieves all memos from the backend.
 * 
 * @returns {Promise<Object[]>} Array of memo objects
 * @throws {Error} If the request fails
 */
export const fetchMemos = async () => {
    try {
        const response = await fetch(`${API_URL}/memos/`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error ${response.status}:`, errorText);
            throw new Error(`Server error: ${response.status}`);
        }

    } catch (error) {
        console.error("Fetch memos failed:", error);
        throw new Error(`Failed to fetch memos: ${error.message}`);
    }
};

/**
 * Imports Google Keep notes from a Takeout ZIP file.
 * 
 * @param {string} fileUri - URI of the ZIP file
 * @returns {Promise<Object>} response JSON
 */
export const importKeepNotes = async (fileUri) => {
    try {
        const uploadResult = await uploadAsync(`${API_URL}/memos/import/keep`, fileUri, {
            fieldName: 'file',
            httpMethod: 'POST',
            uploadType: 1, // FileSystem.FileSystemUploadType.MULTIPART
            mimeType: 'application/zip',
            headers: authHeaders(),
        });

        if (uploadResult.status !== 200) {
            throw new Error(`Server error: ${uploadResult.status} - ${uploadResult.body}`);
        }

        return JSON.parse(uploadResult.body);
    } catch (error) {
        console.error("Import Keep notes failed:", error);
        throw new Error(`Failed to import notes: ${error.message}`);
    }
};
