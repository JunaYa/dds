import Journal from './features/journal/App';
import { JournalProvider } from './features/journal/journal-context';

export default function App() {
  return (
    <JournalProvider>
      <Journal />
    </JournalProvider>
  );
}
