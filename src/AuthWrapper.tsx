import { MotionConfig } from 'framer-motion';
import { useSyncExternalStore } from 'react';
import { progressOwner, PROGRESS_OWNER_EVENT } from './services/progressStorage';
const subscribe = (fn: () => void) => { window.addEventListener(PROGRESS_OWNER_EVENT, fn); window.addEventListener('storage', fn); return () => { window.removeEventListener(PROGRESS_OWNER_EVENT, fn); window.removeEventListener('storage', fn); }; };
import App from './App'
import { useAuthStore, AuthProvider } from './store/authStore'

export default function AuthWrapper() {
  const authStore = useAuthStore();
  const owner = useSyncExternalStore(subscribe, progressOwner, () => 'guest');

  return (
    <AuthProvider value={authStore}>
      <MotionConfig reducedMotion="user"><App key={owner} /></MotionConfig>
    </AuthProvider>
  );
}

