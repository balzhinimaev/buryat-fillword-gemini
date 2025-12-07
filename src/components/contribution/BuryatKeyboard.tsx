// src/components/contribution/BuryatKeyboard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { BURYAT_SPECIAL_CHARS_LOWER, BURYAT_SPECIAL_CHARS_UPPER } from './constants';

interface BuryatKeyboardProps {
  onChar: (char: string) => void;
  visible: boolean;
}

export const BuryatKeyboard: React.FC<BuryatKeyboardProps> = ({ onChar, visible }) => {
  if (!visible) return null;
  
  // Объединяем большие и маленькие буквы в один массив
  const allChars = [...BURYAT_SPECIAL_CHARS_UPPER, ...BURYAT_SPECIAL_CHARS_LOWER];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-2 flex-wrap justify-center"
    >
      {allChars.map((char) => (
        <motion.button
          key={char}
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChar(char)}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 
                     text-white font-bold text-lg shadow-lg shadow-amber-500/30
                     hover:from-amber-400 hover:to-orange-500 transition-all
                     flex items-center justify-center"
        >
          {char}
        </motion.button>
      ))}
    </motion.div>
  );
};

