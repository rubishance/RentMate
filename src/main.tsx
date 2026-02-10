import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from "@sentry/react";
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/formatted_error_boundary'



Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // Will be undefined in dev, effectively disabled/mocked
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0,
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

console.log('Main.tsx executing...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('FATAL: Root element not found!');
  } else {
    // console.log('Root element found, attempting to mount...');
    createRoot(rootElement).render(
      <StrictMode>
        <HelmetProvider>
          <ErrorBoundary>
            <Toaster
              position="top-center"
              richColors
              closeButton
              theme="system"
              toastOptions={{
                className: 'font-sans rounded-[1.25rem] shadow-premium',
                style: { borderRadius: '1.25rem' }
              }}
            />
            <App />
          </ErrorBoundary>
        </HelmetProvider>
      </StrictMode>,
    );
    // console.log('Mount called.');
  }
} catch (e) {
  console.error('FATAL: Error in main.tsx:', e);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

