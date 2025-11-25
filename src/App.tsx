// src/App.tsx
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';

// Screens
import MainMenu from './screens/MainMenu';
import LevelsScreen from './screens/LevelsScreen';
import GameScreen from './screens/GameScreen';
import SettingsScreen from './screens/SettingsScreen';
import StatsScreen from './screens/StatsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import DictionaryScreen from './screens/DictionaryScreen';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3,
};

export default function App() {
  const store = useGameStore();
  const { currentScreen } = store.state;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'menu':
        return <MainMenu store={store} />;
      case 'levels':
        return <LevelsScreen store={store} />;
      case 'game':
        return <GameScreen store={store} />;
      case 'settings':
        return <SettingsScreen store={store} />;
      case 'stats':
        return <StatsScreen store={store} />;
      case 'leaderboard':
        return <LeaderboardScreen store={store} />;
      case 'dictionary':
        return <DictionaryScreen store={store} />;
      default:
        return <MainMenu store={store} />;
    }
  };

  return (
    <div className="min-h-[100dvh] max-w-md mx-auto bg-slate-100 shadow-2xl overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="min-h-[100dvh]"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
