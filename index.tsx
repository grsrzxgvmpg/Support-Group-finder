import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ToastProvider } from './components/Toast';
import { isNativePlatform } from './services/platform';
import './index.css';

// Service worker only makes sense on the web - the native shells ship
// their assets locally and WKWebView doesn't support service workers
if (!isNativePlatform) {
  registerSW({ immediate: true });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);