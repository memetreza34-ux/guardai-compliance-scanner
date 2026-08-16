import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import BillingReturnPage from './components/BillingReturnPage';
import PublicTrustPage from './components/PublicTrustPage';
import { ThemeProvider } from './components/ThemeProvider';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('GuardAI root element is missing.');
}

const publicTrustMatch = window.location.pathname.match(/^\/trust\/([A-Za-z0-9_-]{24,80})\/?$/);
const billingReturn = /^\/billing\/return\/?$/.test(window.location.pathname);
const rootView = publicTrustMatch
  ? <PublicTrustPage publicSlug={publicTrustMatch[1]} />
  : billingReturn
    ? <BillingReturnPage />
    : <App />;

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="guardai-ui-theme">
        {rootView}
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
