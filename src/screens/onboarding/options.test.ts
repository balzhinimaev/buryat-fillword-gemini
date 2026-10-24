import { describe, it, expect } from 'vitest';
import { buildOnboardingRequest, isStepComplete, type OnboardingForm } from './options';

const form = (overrides: Partial<OnboardingForm> = {}): OnboardingForm => ({
  name: 'Баир',
  ageRange: '25-34',
  buriatLevel: 'beginner',
  reminderPlan: 'daily-10',
  reminderTime: 'morning',
  ...overrides,
});

describe('buildOnboardingRequest', () => {
  it('собирает полный запрос с обрезанным именем', () => {
    expect(buildOnboardingRequest(form({ name: '  Баир  ' }))).toEqual({
      onboardingCompleted: true,
      onboardingStep: 'done',
      name: 'Баир',
      ageRange: '25-34',
      buriatLevel: 'beginner',
      reminderPlan: 'daily-10',
      reminderTime: 'morning',
    });
  });

  it('не отправляет «Не указывать» и «Пропустить» на сервер', () => {
    const request = buildOnboardingRequest(form({ ageRange: 'prefer_not_to_say', buriatLevel: 'skip' }));
    expect(request.ageRange).toBeUndefined();
    expect(request.buriatLevel).toBeUndefined();
  });

  it('не отправляет время напоминаний при выключенных напоминаниях', () => {
    const request = buildOnboardingRequest(form({ reminderPlan: 'off', reminderTime: 'morning' }));
    expect(request.reminderPlan).toBe('off');
    expect(request.reminderTime).toBeUndefined();
  });
});

describe('isStepComplete', () => {
  it('имя: минимум 2 символа без пробелов', () => {
    expect(isStepComplete('name', form({ name: ' Б ' }))).toBe(false);
    expect(isStepComplete('name', form({ name: 'Ба' }))).toBe(true);
  });

  it('возраст и уровень: требуется выбор', () => {
    expect(isStepComplete('age', form({ ageRange: null }))).toBe(false);
    expect(isStepComplete('age', form())).toBe(true);
    expect(isStepComplete('level', form({ buriatLevel: null }))).toBe(false);
    expect(isStepComplete('level', form({ buriatLevel: 'skip' }))).toBe(true);
  });

  it('напоминания: «off» не требует времени, остальные планы требуют', () => {
    expect(isStepComplete('reminders', form({ reminderPlan: 'off', reminderTime: null }))).toBe(true);
    expect(isStepComplete('reminders', form({ reminderPlan: 'daily-10', reminderTime: null }))).toBe(false);
    expect(isStepComplete('reminders', form())).toBe(true);
  });
});
