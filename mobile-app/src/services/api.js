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

export const captureThought = async (input) => {
    try {
        const formData = new FormData();

        if (typeof input === 'string') {
            formData.append('text', input);
        } else if (input.type === 'audio') {
            formData.append('file', {
                uri: input.uri,
                name: 'recording.m4a',
                type: 'audio/m4a',
            });
        } else if (input.type === 'image') {
            const uriParts = input.uri.split('.');
            const fileType = uriParts[uriParts.length - 1];

            formData.append('file', {
                uri: input.uri,
                name: `photo.${fileType}`,
                type: `image/${fileType}`,
            });
        }

        const response = await fetch(`${API_URL}/capture`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Capture failed:", error);
        throw error;
    }
};
