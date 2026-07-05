import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'cognitive_inbox_token';

let authToken = null;
let onUnauthorized = null;

export const getAuthToken = () => authToken;

export const setUnauthorizedHandler = (handler) => {
    onUnauthorized = handler;
};

export const loadStoredToken = async () => {
    try {
        if (Platform.OS === 'web') {
            authToken = window.localStorage.getItem(TOKEN_KEY);
        } else {
            authToken = await SecureStore.getItemAsync(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Failed to load stored token:', error);
        authToken = null;
    }
    return authToken;
};

export const storeToken = async (token) => {
    authToken = token;
    try {
        if (Platform.OS === 'web') {
            if (token) {
                window.localStorage.setItem(TOKEN_KEY, token);
            } else {
                window.localStorage.removeItem(TOKEN_KEY);
            }
        } else if (token) {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Failed to persist token:', error);
    }
};

export const clearToken = () => storeToken(null);

export const authHeaders = () => (
    authToken ? { Authorization: `Bearer ${authToken}` } : {}
);

/**
 * fetch() wrapper that attaches the auth token and signs the user out on 401.
 */
export const authFetch = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...authHeaders(),
            ...(options.headers || {}),
        },
    });

    if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
    }

    return response;
};
