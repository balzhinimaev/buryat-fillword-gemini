# 🇲🇳 Buryat Fillword API

API для сбора и верификации бурятских слов (Үгын Дархан — Словарная Мастерская).

## 📊 Модели данных

### 1. Contributor (Контрибьютор)

Пользователи, которые добавляют и проверяют слова.

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | String | Отображаемое имя |
| `telegramId` | Number | Telegram user ID (для авторизации) |
| `telegramUsername` | String | @username в Telegram |
| `stats.wordsAdded` | Number | Сколько слов добавил |
| `stats.wordsVerified` | Number | Сколько слов проверил |
| `stats.wordsApproved` | Number | Сколько его слов прошли верификацию |
| `stats.wordsRejected` | Number | Сколько его слов отклонено |
| `stats.verificationAccuracy` | Number | Точность верификации (0-100%) |
| `role` | Enum | `user`, `trusted`, `moderator`, `admin` |
| `trustScore` | Number | Уровень доверия (0-100) |
| `isBanned` | Boolean | Забанен ли |
| `createdAt` | Date | Дата регистрации |
| `lastActiveAt` | Date | Последняя активность |

### 2. Word (Слово)

Бурятские слова с переводом.

| Поле | Тип | Описание |
|------|-----|----------|
| `bur` | String | Бурятское слово (UPPERCASE) |
| `ru` | String | Русский перевод |
| `categoryId` | String | ID категории |
| `example` | String | Пример использования |
| `pronunciation` | String | Транскрипция |
| `audioUrl` | String | URL аудио |
| `synonyms` | [String] | Синонимы |
| `dialect` | Enum | `standard`, `western`, `eastern`, `southern` |
| `partOfSpeech` | Enum | `noun`, `verb`, `adjective`, etc. |
| `contributor.id` | ObjectId | Кто добавил |
| `contributor.name` | String | Имя автора |
| `status` | Enum | `pending`, `verified`, `rejected`, `archived` |
| `verificationScore` | Number | Сумма голосов |
| `upvotes` | [ObjectId] | Кто подтвердил |
| `downvotes` | [ObjectId] | Кто отклонил |
| `isActiveInGame` | Boolean | Используется в филвордах |
| `difficulty` | Number | Сложность (1-10) |

### 3. Vote (Голос)

Отдельная коллекция для аналитики голосования.

| Поле | Тип | Описание |
|------|-----|----------|
| `word` | ObjectId | Ссылка на слово |
| `contributor` | ObjectId | Кто голосовал |
| `type` | Enum | `upvote` / `downvote` |
| `reason` | String | Причина (для downvote) |

### 4. Category (Категория)

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String | Уникальный slug |
| `name` | String | Название (рус) |
| `nameBur` | String | Название (бур) |
| `emoji` | String | Эмодзи |
| `difficulty` | Enum | `easy`, `medium`, `hard` |
| `gridSize` | Number | Размер сетки филворда |
| `wordCount` | Number | Количество слов |

### 5. Report (Жалоба)

| Поле | Тип | Описание |
|------|-----|----------|
| `word` | ObjectId | На какое слово |
| `reporter` | ObjectId | Кто подал |
| `type` | Enum | Тип жалобы |
| `message` | String | Текст |
| `status` | Enum | `open`, `resolved`, etc. |

### 6. ActivityLog (Лог активности)

Автоматически удаляется через 90 дней.

| Поле | Тип | Описание |
|------|-----|----------|
| `contributor` | ObjectId | Кто совершил действие |
| `action` | String | Тип действия |
| `target` | Object | Цель действия |
| `details` | Mixed | Дополнительные данные |

---

## 🔌 API Эндпоинты

### Слова

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/words` | Получить список слов |
| GET | `/api/words/pending` | Слова для верификации |
| GET | `/api/words/stats` | Статистика |
| GET | `/api/words/export` | Экспорт верифицированных |
| POST | `/api/words` | Добавить слово |
| POST | `/api/words/:id/vote` | Голосовать |

### Контрибьюторы

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/contributors` | Список |
| GET | `/api/contributors/top` | Топ контрибьюторов |
| POST | `/api/contributors` | Регистрация |
| GET | `/api/contributors/:id` | Профиль |

---

## 🔐 Система верификации

```
┌─────────────────────────────────────────────────────────┐
│                    НОВОЕ СЛОВО                          │
│                   (status: pending)                     │
└─────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
      ┌─────────┐   ┌─────────┐    ┌─────────┐
      │ Голос 1 │   │ Голос 2 │    │ Голос 3 │
      │   ✓     │   │   ✓     │    │   ✓     │
      └─────────┘   └─────────┘    └─────────┘
           │              │              │
           └──────────────┼──────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   ВЕРИФИЦИРОВАНО                        │
│     (status: verified, isActiveInGame: true)            │
└─────────────────────────────────────────────────────────┘
```

### Правила:
- **3 upvotes** → слово верифицировано
- **3 downvotes** → слово отклонено
- Нельзя голосовать за свои слова
- Вес голоса зависит от роли:
  - `user`: 1
  - `trusted`: 2
  - `moderator`: 5
  - `admin`: 10

---

## 📈 Trust Score (Уровень доверия)

Каждый пользователь имеет `trustScore` от 0 до 100.

### Изменения:
| Действие | Изменение |
|----------|-----------|
| Слово верифицировано | +5 |
| Слово отклонено | -3 |
| Правильный голос | +2 |
| Неправильный голос | -5 |

### Эффекты:
- `trustScore < 20`: нельзя голосовать
- `trustScore > 70`: роль `trusted` (вес голоса x2)
- `trustScore > 90`: кандидат на модератора

---

## 🚀 Установка

```bash
cd api
npm install
cp .env.example .env
# Настройте MONGODB_URI в .env
npm run dev
```

---

## 🔗 Интеграция с фронтендом

### Синхронизация contributionStore → API

```typescript
// При добавлении слова
const response = await fetch('/api/words', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Contributor-Id': contributorId,
  },
  body: JSON.stringify({ bur, ru, categoryId, example }),
});

// При голосовании
const response = await fetch(`/api/words/${wordId}/vote`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Contributor-Id': contributorId,
  },
  body: JSON.stringify({ type: 'upvote' }),
});
```

### Экспорт слов в формате TypeScript

```bash
curl "http://localhost:3000/api/words/export?format=ts" > src/data/exportedWords.ts
```

---

## 📝 Категории по умолчанию

| ID | Название | Эмодзи | Сложность |
|----|----------|--------|-----------|
| greetings | Приветствия | 👋 | easy |
| family | Семья | 👨‍👩‍👧‍👦 | easy |
| numbers | Числа | 🔢 | easy |
| colors | Цвета | 🎨 | easy |
| animals | Животные | 🐴 | medium |
| nature | Природа | 🌿 | medium |
| body | Тело | 🫀 | medium |
| food | Еда | 🥘 | medium |
| home | Дом | 🏠 | medium |
| time | Время | ⏰ | hard |
| places | Места | 🗺️ | hard |
| verbs | Глаголы | 🏃 | hard |
| adjectives | Прилагательные | ✨ | hard |
| other | Другое | 📝 | medium |

---

## 🛡️ Безопасность

- Rate limiting (50 слов/день, 100 голосов/день)
- Хеширование IP адресов
- Device fingerprint для мультиаккаунтов
- Telegram авторизация для верификации личности
- Бан система с причинами

---

## 🔮 Будущие улучшения

- [ ] Telegram Bot для модерации
- [ ] WebSocket для real-time обновлений
- [ ] Аудио записи произношения
- [ ] ML для автодетекции ошибок
- [ ] Gamification: бейджи, достижения

