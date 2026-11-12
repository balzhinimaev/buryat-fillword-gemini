import type { LearningCourse, CourseLesson } from './czech';
const lesson = (id: string, title: string, note: string, rows: [string, string][]): CourseLesson => ({ id, title, note, words: rows.map(([text, ru], i) => ({ id: `${id}-${i + 1}`, text, ru })) });
export const englishCourse: LearningCourse = {
  id: 'en-ru', language: 'en', instructionLanguage: 'ru', title: 'Английский', nativeTitle: 'English', alphabet: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  lessons: [
    lesson('greetings', 'Первые слова', 'Hello — «привет», goodbye — «до свидания». Please добавляют к просьбе, а thanks используют, чтобы поблагодарить. На поле каждая буква занимает отдельную клетку.', [['hello','привет'],['goodbye','до свидания'],['yes','да'],['no','нет'],['please','пожалуйста'],['thanks','спасибо']]),
    lesson('family', 'Семья', 'Mother — «мать», father — «отец». Слово child означает ребёнка независимо от пола. В словаре здесь дана форма единственного числа.', [['mother','мать'],['father','отец'],['sister','сестра'],['brother','брат'],['child','ребёнок'],['family','семья']]),
    lesson('home', 'Дома', 'House — дом как здание, room — комната. В слове chair сочетание ch занимает две клетки: C и H. В этом курсе мы учим написание целых слов.', [['house','дом (здание)'],['room','комната'],['window','окно'],['door','дверь'],['table','стол'],['chair','стул']]),
    lesson('food', 'Еда и напитки', 'Water, milk и bread обычно называют вещество или продукт без указания количества. Apple — отдельный фрукт. Для начала запомните слова вместе с переводом.', [['water','вода'],['bread','хлеб'],['milk','молоко'],['cheese','сыр'],['apple','яблоко'],['tea','чай']]),
    lesson('city', 'В городе', 'City — город, street — улица. Не угадывайте английское произношение только по буквам: написание и звучание могут заметно различаться. Используйте озвучку, если она доступна.', [['city','город'],['street','улица'],['school','школа'],['bridge','мост'],['train','поезд'],['park','парк']]),
    lesson('nature', 'Природа', 'Forest — лес, river — река, sea — море. Слова rain и sun помогут описывать погоду. На поле нужно найти именно английское написание.', [['forest','лес'],['river','река'],['sea','море'],['mountain','гора'],['sun','солнце'],['rain','дождь']]),
    lesson('animals', 'Животные', 'Здесь названия животных даны в единственном числе. Cat — кошка или кот, dog — собака. Перевод помогает понять значение, но не заменяет звучание слова.', [['dog','собака'],['cat','кошка / кот'],['bird','птица'],['fish','рыба'],['horse','лошадь'],['cow','корова']]),
    lesson('time', 'Время', 'Today — «сегодня», tomorrow — «завтра». Morning — утро, evening — вечер. Обратите внимание на две буквы r в tomorrow.', [['day','день'],['night','ночь'],['morning','утро'],['evening','вечер'],['today','сегодня'],['tomorrow','завтра']]),
  ],
};
