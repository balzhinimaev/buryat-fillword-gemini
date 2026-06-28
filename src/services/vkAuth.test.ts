import { beforeEach, describe, expect, it } from 'vitest';
import { parseVkReturn, consumeWebVkReturn, takePkce } from './vkAuth';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/webapp/');
});

describe('parseVkReturn (натив deep-link)', () => {
  it('извлекает code, device_id, state', () => {
    const r = parseVkReturn('ru.burlive.app://vk?code=ABC123&device_id=DEV9&state=ST5');
    expect(r).toEqual({ code: 'ABC123', deviceId: 'DEV9', state: 'ST5' });
  });

  it('декодирует url-энкодед значения', () => {
    const r = parseVkReturn('ru.burlive.app://vk?code=a%2Bb%2Fc&device_id=d&state=s');
    expect(r?.code).toBe('a+b/c');
  });

  it('возвращает null для чужой схемы и без кода', () => {
    expect(parseVkReturn('https://example.com/cb?code=x')).toBeNull();
    expect(parseVkReturn('ru.burlive.app://vk?state=x')).toBeNull();
    expect(parseVkReturn('')).toBeNull();
  });
});

describe('consumeWebVkReturn (веб-возврат)', () => {
  it('читает ?vk_code/vk_device_id/vk_state и чистит URL', () => {
    window.history.replaceState(null, '', '/webapp/?vk_code=A1&vk_device_id=B2&vk_state=C3&keep=1');
    const r = consumeWebVkReturn();
    expect(r).toEqual({ code: 'A1', deviceId: 'B2', state: 'C3' });
    // vk_* удалены, посторонние параметры сохранены
    expect(window.location.search).not.toContain('vk_code');
    expect(window.location.search).toContain('keep=1');
  });

  it('возвращает null без vk_code', () => {
    window.history.replaceState(null, '', '/webapp/?foo=bar');
    expect(consumeWebVkReturn()).toBeNull();
  });
});

describe('takePkce (PKCE verifier + проверка state)', () => {
  it('возвращает verifier при совпадении state и очищает хранилище', () => {
    localStorage.setItem('vk_pkce', JSON.stringify({ verifier: 'VERIF', state: 'STATE' }));
    expect(takePkce('STATE')).toBe('VERIF');
    expect(localStorage.getItem('vk_pkce')).toBeNull();
  });

  it('возвращает null при несовпадении state (CSRF-защита)', () => {
    localStorage.setItem('vk_pkce', JSON.stringify({ verifier: 'VERIF', state: 'STATE' }));
    expect(takePkce('WRONG')).toBeNull();
  });

  it('возвращает null, если ничего не сохранено', () => {
    expect(takePkce('any')).toBeNull();
  });
});
