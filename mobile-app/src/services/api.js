const API_URL = 'http://172.16.27.76:8000';

export const captureThought = async (input, tags = []) => {
    try {
        const formData = new FormData();

        // Send available tags for dynamic categorization
        formData.append('available_tags', JSON.stringify(tags));

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
