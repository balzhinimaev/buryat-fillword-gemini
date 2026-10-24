// Конфигурация шагов онбординга, варианты ответов и чистая логика формы
import type React from 'react';
import { Sun, Sunset, Moon } from 'lucide-react';
import type {
  AgeRange,
  BuriatLevel,
  ReminderPlan,
  ReminderTime,
  UpdateOnboardingRequest,
} from '../../services/api';

export type OnboardingStep = 'name' | 'age' | 'level' | 'reminders';

export const STEPS: OnboardingStep[] = ['name', 'age', 'level', 'reminders'];

export const STEP_CONFIG: Record<OnboardingStep, { title: string; subtitle: string; emoji: string }> = {
  name: {
    title: 'Как вас зовут?',
    subtitle: 'Это имя будет отображаться в игре',
    emoji: '👋',
  },
  age: {
    title: 'Ваш возраст',
    subtitle: 'Поможет подобрать контент',
    emoji: '🎂',
  },
  level: {
    title: 'Ваш уровень бурятского',
    subtitle: 'Чтобы настроить сложность',
    emoji: '📚',
  },
  reminders: {
    title: 'Напоминания',
    subtitle: 'Когда вам удобнее заниматься?',
    emoji: '🔔',
  },
};

export const AGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: '18-24', label: '18-24 года' },
  { value: '25-34', label: '25-34 года' },
  { value: '35-44', label: '35-44 года' },
  { value: '45+', label: '45+ лет' },
  { value: 'prefer_not_to_say', label: 'Не указывать' },
];

export const LEVEL_OPTIONS: { value: BuriatLevel; label: string; description: string; emoji: string }[] = [
  { value: 'beginner', label: 'Начинающий', description: 'Только начинаю изучать', emoji: '🌱' },
  { value: 'intermediate', label: 'Средний', description: 'Понимаю базовые фразы', emoji: '🌿' },
  { value: 'advanced', label: 'Продвинутый', description: 'Свободно общаюсь', emoji: '🌳' },
  { value: 'native', label: 'Носитель', description: 'Родной язык', emoji: '🏔️' },
  { value: 'skip', label: 'Пропустить', description: '', emoji: '⏭️' },
];

export const REMINDER_PLAN_OPTIONS: { value: ReminderPlan; label: string; description: string; emoji: string }[] = [
  { value: 'daily-10', label: 'Ежедневно', description: '~10 минут в день', emoji: '📆' },
  { value: '3x-week-15', label: '3 раза в неделю', description: '~15 минут', emoji: '📅' },
  { value: 'weekend-20', label: 'По выходным', description: '~20 минут', emoji: '🗓️' },
  { value: 'off', label: 'Без напоминаний', description: '', emoji: '🔕' },
];

export const REMINDER_TIME_OPTIONS: { value: ReminderTime; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'morning', label: 'Утро', icon: Sun },
  { value: 'day', label: 'День', icon: Sunset },
  { value: 'evening', label: 'Вечер', icon: Moon },
];

// Ответы пользователя по всем шагам
export interface OnboardingForm {
  name: string;
  ageRange: AgeRange | null;
  buriatLevel: BuriatLevel | null;
  reminderPlan: ReminderPlan | null;
  reminderTime: ReminderTime | null;
}

// Заполнен ли шаг достаточно, чтобы идти дальше
export function isStepComplete(step: OnboardingStep, form: OnboardingForm): boolean {
  switch (step) {
    case 'name':
      return form.name.trim().length >= 2;
    case 'age':
      return form.ageRange !== null;
    case 'level':
      return form.buriatLevel !== null;
    case 'reminders':
      return form.reminderPlan !== null && (form.reminderPlan === 'off' || form.reminderTime !== null);
    default:
      return false;
  }
}

// «Не указывать»/«Пропустить» — это отсутствие ответа, на сервер не отправляем;
// время напоминаний без плана напоминаний не имеет смысла
export function buildOnboardingRequest(form: OnboardingForm): UpdateOnboardingRequest & { name: string } {
  const request: UpdateOnboardingRequest & { name: string } = {
    onboardingCompleted: true,
    onboardingStep: 'done',
    name: form.name.trim(),
  };

  if (form.ageRange && form.ageRange !== 'prefer_not_to_say') {
    request.ageRange = form.ageRange;
  }
  if (form.buriatLevel && form.buriatLevel !== 'skip') {
    request.buriatLevel = form.buriatLevel;
  }
  if (form.reminderPlan) {
    request.reminderPlan = form.reminderPlan;
  }
  if (form.reminderTime && form.reminderPlan !== 'off') {
    request.reminderTime = form.reminderTime;
  }

  return request;
}
