export interface CourseWord { id: string; text: string; ru: string }
export interface CourseLesson { id: string; title: string; note: string; words: CourseWord[] }
export interface LearningCourse { id: string; language: string; instructionLanguage: 'ru'; title: string; nativeTitle: string; alphabet: string[]; lessons: CourseLesson[] }
const lesson = (id: string, title: string, note: string, rows: [string, string][]): CourseLesson => ({
  id, title, note, words: rows.map(([text, ru], index) => ({ id: `${id}-${index + 1}`, text, ru })),
});
export const czechCourse: LearningCourse = {
  id: 'cs-ru', language: 'cs', instructionLanguage: 'ru', title: 'Чешский', nativeTitle: 'Čeština',
  alphabet: ['A','Á','B','C','Č','D','Ď','E','É','Ě','F','G','H','CH','I','Í','J','K','L','M','N','Ň','O','Ó','P','R','Ř','S','Š','T','Ť','U','Ú','Ů','V','Y','Ý','Z','Ž'],
  lessons: [
    lesson('greetings', 'Первые слова', 'Ahoj и čau — неформальные приветствия; čau также говорят при прощании. Prosím — «пожалуйста». Долгие гласные отмечаются знаком ´: í в слове díky произносится дольше, чем i.', [['ahoj','привет'],['ano','да'],['ne','нет'],['díky','спасибо (неформально)'],['prosím','пожалуйста'],['čau','привет / пока (неформально)']]),
    lesson('family', 'Семья', 'Máma и táta — разговорные слова «мама» и «папа». В чешском важно сохранять знаки над буквами: dítě — «ребёнок».', [['máma','мама'],['táta','папа'],['sestra','сестра'],['bratr','брат'],['dítě','ребёнок'],['rodina','семья']]),
    lesson('home', 'Дома', 'Ů обозначает долгий звук у, как и ú. Dveře — слово во множественном числе, которым называют и одну дверь. На поле ů и u — разные буквы.', [['dům','дом'],['byt','квартира'],['pokoj','комната'],['okno','окно'],['dveře','дверь / двери'],['stůl','стол']]),
    lesson('food', 'Еда и напитки', 'CH в чешском считается одной буквой и произносится как русский х. В этом филворде CH занимает одну клетку: CH–L–É–B. Č читается примерно как русский ч.', [['voda','вода'],['chléb','хлеб'],['mléko','молоко'],['sýr','сыр'],['jablko','яблоко'],['čaj','чай']]),
    lesson('city', 'В городе', 'Š читается примерно как русский ш. Буква ě влияет на произношение предшествующего согласного: слово město нельзя читать просто по русским названиям букв.', [['město','город'],['ulice','улица'],['škola','школа'],['most','мост'],['vlak','поезд'],['park','парк']]),
    lesson('nature', 'Природа', 'Ř — особый чешский звук, не совпадающий с русским р. Ť обозначает мягкий согласный. Не убирайте диакритику в словах řeka и déšť.', [['les','лес'],['řeka','река'],['moře','море'],['hora','гора'],['slunce','солнце'],['déšť','дождь']]),
    lesson('animals', 'Животные', 'Ň — мягкий согласный, напоминающий русский нь. В слове kůň одновременно встречаются долгий гласный ů и мягкий согласный ň.', [['pes','собака'],['kočka','кошка'],['pták','птица'],['ryba','рыба'],['kůň','лошадь'],['kráva','корова']]),
    lesson('time', 'Время', 'Dnes — «сегодня», zítra — «завтра». Č в слове večer и долгие á, í в ráno и zítra — часть правильного написания, а не украшение.', [['den','день'],['noc','ночь'],['ráno','утро'],['večer','вечер'],['dnes','сегодня'],['zítra','завтра']]),
  ],
};
export const COURSE_IDS = ['bua-ru', 'cs-ru', 'en-ru'] as const;
export type CourseId = typeof COURSE_IDS[number];
