import release from '../../release.json';
export const APP_VERSION_CODE = Number(import.meta.env.VITE_APP_VERSION_CODE || release.versionCode);
export const APP_VERSION_NAME = import.meta.env.VITE_APP_VERSION_NAME || release.version;
