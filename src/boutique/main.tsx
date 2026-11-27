import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { applyTheme, getThemePref } from '../theme';
import App from './App';

applyTheme(getThemePref());
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
