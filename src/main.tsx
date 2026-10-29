import { createRoot } from 'react-dom/client';
import { isTauri } from '@tauri-apps/api/core';
import App from './App';
import './styles.css';

if (isTauri()) document.documentElement.dataset.nativeApp = 'true';

createRoot(document.getElementById('app')!).render(<App />);
