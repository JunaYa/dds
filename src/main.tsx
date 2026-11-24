import { createRoot } from 'react-dom/client';
import { isTauri } from '@tauri-apps/api/core';
import App from './App';
import './styles.css';
import { installFocusModality } from '@vita/ui/lib/focus-modality';

const removeFocusModality = installFocusModality(document);
if (import.meta.hot) import.meta.hot.dispose(removeFocusModality);

if (isTauri()) document.documentElement.dataset.nativeApp = 'true';

createRoot(document.getElementById('app')!).render(<App />);
