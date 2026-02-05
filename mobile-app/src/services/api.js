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
export const captureThought = async (input, tags = []) => {
    try {
        const formData = new FormData();

        // Send available tags for dynamic categorization
        formData.append('available_tags', JSON.stringify(tags));

        if (typeof input === 'string') {
            formData.append('text', input);
        } else if (input?.type === 'audio') {
            formData.append('file', {
                uri: input.uri,
                name: 'recording.m4a',
                type: 'audio/m4a',
            });
        } else if (input?.type === 'image') {
            const uriParts = input.uri.split('.');
            const fileType = uriParts[uriParts.length - 1];

            formData.append('file', {
                uri: input.uri,
                name: `photo.${fileType}`,
                type: `image/${fileType}`,
            });
        } else {
            throw new Error('Invalid input: must be a string or object with type and uri');
        }

        // Updated endpoint to match new router structure
        const response = await fetch(`${API_URL}/memos/capture`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error ${response.status}:`, errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Capture failed:", error);
        // Re-throw with more context
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
