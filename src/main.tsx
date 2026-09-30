import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// The desktop widget (#/widget) and floating video (#/video) windows load the same bundle
// but get a tiny tree instead of the full app (router, pages, audio engine).
const hash = window.location.hash;
const Root = lazy(() => (
    hash.startsWith('#/widget') ? import('./components/widget/DesktopWidget')
        : hash.startsWith('#/video') ? import('./components/video/FloatingVideo')
            : import('./App')
));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>,
);
