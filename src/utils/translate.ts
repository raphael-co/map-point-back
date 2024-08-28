import fs from 'fs';
import path from 'path';

// Type pour les traductions
interface Translations {
    [key: string]: string;
}

// Fonction pour charger le fichier JSON de la langue
const loadLanguageFile = (languageCode: string, folder: string, moduleName: string): Translations => {
    const filePath = path.join(__dirname, '..', 'translate', languageCode, folder, moduleName, 'message.json');
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error loading translation file for language "${languageCode}" in folder "${folder}" and module "${moduleName}":`, error);
        return {};
    }
};

// Fonction pour obtenir la traduction
const getTranslation = (key: string, languageCode: string = 'en', folder: string, moduleName: string): string => {
    const translations: Translations = loadLanguageFile(languageCode, folder, moduleName);

    const translation = translations[key];
    if (translation) {
        return translation;
    } else {
        console.warn(`Translation key "${key}" not found for language "${languageCode}" in folder "${folder}" module "${moduleName}".`);
        return key; // Retourne la clé elle-même si la traduction n'est pas trouvée
    }
};

export default getTranslation;
