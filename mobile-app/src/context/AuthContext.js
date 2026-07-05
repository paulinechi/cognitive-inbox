import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../config/api';
import {
    loadStoredToken,
    storeToken,
    clearToken,
    setUnauthorizedHandler,
} from '../services/http';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        setUnauthorizedHandler(() => {
            clearToken();
            setToken(null);
            setUser(null);
        });

        const restoreSession = async () => {
            try {
                const storedToken = await loadStoredToken();
                if (storedToken) {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${storedToken}` },
                    });
                    if (response.ok) {
                        setUser(await response.json());
                        setToken(storedToken);
                    } else if (response.status === 401) {
                        await clearToken();
                    } else {
                        // Backend unreachable or misbehaving: keep the token so a
                        // transient outage doesn't sign the user out.
                        setToken(storedToken);
                    }
                }
            } catch (error) {
                console.error('Session restore failed:', error);
                // Network error: keep the stored token and let requests retry.
                setToken((prev) => prev);
            } finally {
                setInitializing(false);
            }
        };
        restoreSession();
    }, []);

    const authenticate = async (path, email, password) => {
        const response = await fetch(`${API_URL}/auth/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detail = typeof data.detail === 'string'
                ? data.detail
                : 'Something went wrong, please try again.';
            throw new Error(detail);
        }

        await storeToken(data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        return data.user;
    };

    const login = (email, password) => authenticate('login', email, password);
    const register = (email, password) => authenticate('register', email, password);

    const logout = async () => {
        await clearToken();
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, initializing, login, register, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
