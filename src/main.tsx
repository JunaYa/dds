import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const theme = window.matchMedia('(prefers-color-scheme: dark)');
const syncTheme = () => document.documentElement.classList.toggle('dark', theme.matches);
syncTheme();
theme.addEventListener('change', syncTheme);
if (import.meta.hot) {
  import.meta.hot.dispose(() => theme.removeEventListener('change', syncTheme));
}

createRoot(document.getElementById('app')!).render(<App />);
