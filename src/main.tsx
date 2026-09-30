import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// The desktop widget window loads the same bundle at #/widget; it gets a tiny tree
// instead of the full app (router, pages, audio engine).
const isWidget = window.location.hash.startsWith('#/widget');
const Root = lazy(() => (isWidget ? import('./components/widget/DesktopWidget') : import('./App')));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>,
);
