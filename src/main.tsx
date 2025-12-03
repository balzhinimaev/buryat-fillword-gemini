import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthWrapper from './AuthWrapper'

// Импортируем типы Telegram
import './types/telegram'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthWrapper />
  </StrictMode>,
)
