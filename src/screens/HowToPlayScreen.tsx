import TrialLesson from '../components/TrialLesson';
import type { GameStore } from '../store/gameStore';

export default function HowToPlayScreen({ store }: { store: GameStore }) {
  return <TrialLesson
    onExit={() => store.navigate('menu')}
    onContinue={() => {
      store.updateSettings({ hasSeenHowTo: true });
      store.navigate('gameMode');
    }}
  />;
}
