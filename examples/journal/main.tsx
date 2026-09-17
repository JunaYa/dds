import { createRoot } from 'react-dom/client';
import { JournalProvider } from '../../src/features/journal/journal-context';
import App from '../../src/features/journal/App';
import '../../src/styles.css';

const theme = matchMedia('(prefers-color-scheme: dark)');
const syncTheme = () => document.documentElement.classList.toggle('dark', theme.matches);
syncTheme();
theme.addEventListener('change', syncTheme);
if (import.meta.hot) import.meta.hot.dispose(() => theme.removeEventListener('change', syncTheme));
createRoot(document.getElementById('app')!).render(
  <JournalProvider demo>
    <App />
  </JournalProvider>,
);
