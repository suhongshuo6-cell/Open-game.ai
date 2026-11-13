import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/press-start-2p/latin-400.css';
import '@vp-tw/cjk-web-fonts-fusion-pixel-font/dist/12px/proportional/zh_hans/Fusion-Pixel-12px-Proportional-Simplified-Chinese.css';
import { App } from './App';
import { installDemoRuntime } from './demo/demoRuntime';
import './styles.css';
import './glass.css';

// Outside Electron there is no preload bridge: fall back to the browser demo runtime.
if (!('opengame' in window) || !window.opengame) installDemoRuntime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
