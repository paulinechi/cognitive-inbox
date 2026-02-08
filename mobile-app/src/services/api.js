import Constants from 'expo-constants';

const getApiUrl = () => {
    // In development, the debugger host contains the developer's computer IP
    const debuggerHost = Constants.expoConfig?.hostUri;

    if (debuggerHost) {
        const host = debuggerHost.split(':').shift();
        return `http://${host}:8000`;
    }

    // Fallback to localhost if hostUri is not available
    return 'http://localhost:8000';
};

const API_URL = getApiUrl();
console.log('API URL:', API_URL);

/**
 * Captures a thought (text, audio, or image) and sends it to the backend for processing.
 * 
 * @param {string | Object} input - Either a text string or an object with {type, uri}
 * @param {string[]} tags - Available custom tags for categorization
 * @returns {Promise<Object>} Processed memo object
 * @throws {Error} If the request fails or input is invalid
 */
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
            formData.append('text', input);

            const response = await fetch(`${API_URL}/memos/capture`, {
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
                parameters: {
                    'available_tags': JSON.stringify(tags)
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

        return await response.json();
    } catch (error) {
        console.error("Fetch memos failed:", error);
        throw new Error(`Failed to fetch memos: ${error.message}`);
    }
};
