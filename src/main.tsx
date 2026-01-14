import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/formatted_error_boundary'


console.log('Main.tsx executing...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('FATAL: Root element not found!');
  } else {
    // console.log('Root element found, attempting to mount...');
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    // console.log('Mount called.');
  }
} catch (e) {
  console.error('FATAL: Error in main.tsx:', e);
}

