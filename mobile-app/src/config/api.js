import Constants from 'expo-constants';
import { Platform } from 'react-native';

const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

export const getApiUrl = () => {
    // Web should call same-origin and let Vercel rewrite /api to backend.
    // This avoids browser CORS issues while keeping backend logic unchanged.
    if (Platform.OS === 'web') {
        return '/api';
    }

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
