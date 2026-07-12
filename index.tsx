
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/source-serif-4';
import './index.css';
import App from './App';
import DemoDesign from './components/DemoDesign';

// Page de démonstration temporaire du système de design (étape 6) : /?demo
const demo = new URLSearchParams(window.location.search).has('demo');

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      {demo ? <DemoDesign /> : <App />}
    </React.StrictMode>
  );
}
