import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { translations } from '../i18n/translations';
import { setCurrentLanguage } from '../i18n/current';

// Display names for the default (backend-fixed) collection types
const COLLECTION_NAMES_ZH = {
    'All': '全部',
    'Memo': '备忘',
    'Task': '任务',
    'Wishlist': '心愿单',
    'Journal': '日记',
    'Ideas': '想法',
    'Other': '其他',
    'Completed': '已完成',
    'View All': '查看全部',
    '+ New': '+ 新建',
};

const LANGUAGE_KEY = 'cognitive_inbox_language';

const LocaleContext = createContext();

const loadStoredLanguage = async () => {
    try {
        if (Platform.OS === 'web') {
            return window.localStorage.getItem(LANGUAGE_KEY);
        }
        return await SecureStore.getItemAsync(LANGUAGE_KEY);
    } catch {
        return null;
    }
};

const storeLanguage = async (language) => {
    try {
        if (Platform.OS === 'web') {
            window.localStorage.setItem(LANGUAGE_KEY, language);
        } else {
            await SecureStore.setItemAsync(LANGUAGE_KEY, language);
        }
    } catch (error) {
        console.error('Failed to persist language:', error);
    }
};

export const LocaleProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        loadStoredLanguage().then((stored) => {
            if (stored && translations[stored]) {
                setLanguage(stored);
                setCurrentLanguage(stored);
            }
        });
    }, []);

    const changeLanguage = useCallback((newLanguage) => {
        if (!translations[newLanguage]) return;
        setLanguage(newLanguage);
        setCurrentLanguage(newLanguage);
        storeLanguage(newLanguage);
    }, []);

    // t('key') for strings; t('key', arg) for parameterized entries
    const t = useCallback((key, ...args) => {
        const entry = translations[language]?.[key] ?? translations.en[key];
        if (entry === undefined) return key;
        return typeof entry === 'function' ? entry(...args) : entry;
    }, [language]);

    // tc('Task') → localized display name for default collections;
    // custom collection names pass through unchanged
    const tc = useCallback((name) => {
        if (language === 'zh' && COLLECTION_NAMES_ZH[name]) {
            return COLLECTION_NAMES_ZH[name];
        }
        return name;
    }, [language]);

    return (
        <LocaleContext.Provider value={{ language, changeLanguage, t, tc }}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useLocale = () => useContext(LocaleContext);
