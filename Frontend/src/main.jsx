import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AudioPlayerProvider } from './context/AudioPlayerContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
    <AudioPlayerProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AudioPlayerProvider>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1e1b4b',
          color: '#e0e7ff',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: '10px',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#818cf8', secondary: '#1e1b4b' } },
        error:   { iconTheme: { primary: '#f87171', secondary: '#1e1b4b' } },
      }}
    />
    </BrowserRouter>
    
  
)
