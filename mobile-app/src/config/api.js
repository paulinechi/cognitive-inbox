import Constants from 'expo-constants';

const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

export const getApiUrl = () => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
        return trimTrailingSlash(envUrl);
    }

    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
        const host = debuggerHost.split(':').shift();
        return `http://${host}:8000`;
    }

    return 'http://localhost:8000';
};

export const API_URL = getApiUrl();
