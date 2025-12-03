import App from './App'
import { useAuthStore, AuthProvider } from './store/authStore'

export default function AuthWrapper() {
  const authStore = useAuthStore();

  return (
    <AuthProvider value={authStore}>
      <App />
    </AuthProvider>
  );
}

