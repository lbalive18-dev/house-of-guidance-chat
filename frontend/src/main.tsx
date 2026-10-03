import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { initNativeShell } from '@/lib/native';
import '@/index.css';

initNativeShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
