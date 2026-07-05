import Constants from 'expo-constants';
import { Platform } from 'react-native';

const trimTrailingSlash = (url) => url.replace(/\/+$/, '');

export const getApiUrl = () => {
    // Explicit override wins everywhere (also enables local web dev
    // against a local backend: EXPO_PUBLIC_API_URL=http://localhost:8000).
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
        return trimTrailingSlash(envUrl);
    }

    // Web defaults to same-origin /api and lets Vercel rewrite it to the
    // backend. This avoids browser CORS issues.
    if (Platform.OS === 'web') {
        return '/api';
    }

    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
        const host = debuggerHost.split(':').shift();
        return `http://${host}:8000`;
    }

    return 'http://localhost:8000';
};

export const API_URL = getApiUrl();
