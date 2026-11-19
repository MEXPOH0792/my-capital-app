import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './app/ErrorBoundary.jsx';
import StorageConflictNotice from './components/layout/StorageConflictNotice.jsx';
import './index.css';
import './styles/android-design.css';
import { isAndroidDesign } from './app/platformDesign.js';
import { markPerf, measurePerf } from './utils/perfMarks.js';
import { requestPersistentStorage } from './utils/persistentStorage.js';

markPerf('app:cold-start');
if (isAndroidDesign()) document.documentElement.dataset.design = 'android';

// Ask the browser to keep our data persistent so it is not evicted on storage
// pressure or after periods of inactivity (Safari/iOS ITP). Fire-and-forget —
// the grant is sticky and unsupported environments resolve harmlessly.
requestPersistentStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <>
        <App />
        <StorageConflictNotice />
      </>
    </ErrorBoundary>
  </React.StrictMode>,
);

requestAnimationFrame(() => {
  measurePerf('cold-start:first-frame', 'app:cold-start', 'app:first-frame');
});
