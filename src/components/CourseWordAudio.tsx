import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { additionalCourse } from '../courses/activeCourse';
import { burAudioUrl, hasBurAudio } from '../services/burAudio';
import { WaveAudioButton } from './WaveAudioButton';

export function CourseWordAudio({ word }: { word: string }) {
  const course = additionalCourse();
  const [voice, setVoice] = useState<SpeechSynthesisVoice>();
  useEffect(() => {
    if (!course || !('speechSynthesis' in window)) return;
    const update = () => setVoice(speechSynthesis.getVoices().find(v => v.lang.split('-')[0] === course.language));
    update(); speechSynthesis.addEventListener('voiceschanged', update);
    return () => { speechSynthesis.removeEventListener('voiceschanged', update); speechSynthesis.cancel(); };
  }, [course]);
  if (!course) return hasBurAudio(word) ? <WaveAudioButton src={burAudioUrl(word)!} size="sm" /> : null;
  if (!voice) return <span className="text-xs opacity-60">Нет голоса для озвучки на устройстве</span>;
  return <button type="button" className="min-h-11 min-w-11 inline-flex items-center justify-center" aria-label={`Прослушать ${word}`} onClick={() => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word); utterance.voice = voice;
    utterance.lang = voice.lang; utterance.rate = 0.8; speechSynthesis.speak(utterance);
  }}><Volume2 size={18} /></button>;
}
