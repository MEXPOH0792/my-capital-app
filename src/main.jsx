import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './app/ErrorBoundary.jsx';
import './index.css';
import { markPerf, measurePerf } from './utils/perfMarks.js';
import { requestPersistentStorage } from './utils/persistentStorage.js';

markPerf('app:cold-start');

// Ask the browser to keep our data persistent so it is not evicted on storage
// pressure or after periods of inactivity (Safari/iOS ITP). Fire-and-forget —
// the grant is sticky and unsupported environments resolve harmlessly.
requestPersistentStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

requestAnimationFrame(() => {
  measurePerf('cold-start:first-frame', 'app:cold-start', 'app:first-frame');
});
