import { buryatCourse } from './buryat';
import { czechCourse } from './czech';
import { englishCourse } from './english';
import type { CourseId, LearningCourse } from './model';
export const courses: LearningCourse[] = [buryatCourse, czechCourse, englishCourse];
export const courseById = (id: CourseId): LearningCourse => courses.find(course => course.id === id) || buryatCourse;
export const uniqueWords = (course: LearningCourse) => [...new Map(course.lessons.flatMap(lesson => lesson.words).map(word => [word.id, word])).values()];
