// Module-level mirror of the active language so non-React code
// (e.g. src/services/api.js) can read it without hooks.
let currentLanguage = 'en';

export const setCurrentLanguage = (language) => {
    currentLanguage = language;
};

export const getCurrentLanguage = () => currentLanguage;
