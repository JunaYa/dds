import Journal from './App';
import { JournalProvider } from './journal-context';

export default function JournalTestApp() {
  return <JournalProvider><Journal /></JournalProvider>;
}
