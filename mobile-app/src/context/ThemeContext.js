import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light'); // 'light' or 'dark'

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const colors = {
        light: {
            background: '#F9F9FB',
            card: '#FFFFFF',
            text: '#111827',
            textSecondary: '#6B7280',
            border: '#F3F4F6',
            tint: '#000000',
            inputBackground: '#FFFFFF',
            placeholder: '#D1D5DB',
        },
        dark: {
            background: '#111827',
            card: '#1F2937',
            text: '#F9FAFB',
            textSecondary: '#9CA3AF',
            border: '#374151',
            tint: '#FFFFFF',
            inputBackground: '#1F2937',
            placeholder: '#6B7280',
        }
    };

    const themeColors = colors[theme];

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, colors: themeColors, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
