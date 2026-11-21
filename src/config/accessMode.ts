/** Runtime switch: reload the app after changing public/runtime-config.js.
 * Guest access only uses the existing local engine; server authorization stays intact.
 */
declare global {
  interface Window {
    __FILLWORD_CONFIG__?: { authMode?: 'required' | 'guest' | 'telegram' };
  }
}
export const GUEST_MODE = typeof window !== 'undefined'
  && window.__FILLWORD_CONFIG__?.authMode === 'guest';

export const TELEGRAM_MODE = typeof window !== 'undefined'
  && window.__FILLWORD_CONFIG__?.authMode === 'telegram';
