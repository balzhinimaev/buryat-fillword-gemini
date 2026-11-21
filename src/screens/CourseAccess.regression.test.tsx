import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddWordForm } from '../components/contribution/AddWordForm';
import WordDetailScreen from './WordDetailScreen';
import ProfileScreen from './ProfileScreen';
import { ThemeProvider } from '../theme/ThemeContext';
import { chooseCourse } from '../courses/progress';
import { courseWords } from '../courses/activeCourse';
import { canOpenCourseScreen, supportsWordCommunity } from '../courses/access';
import * as api from '../services/api';
vi.mock('../config/offline',()=>({OFFLINE:true,isNetOnline:()=>true}));
const auth=vi.hoisted(()=>({id:'offline_user',role:'user'}));
vi.mock('../store/authStore',()=>({useAuth:()=>({state:{isAuthenticated:true,user:{_id:auth.id,role:auth.role}},refreshUser:vi.fn()})}));
vi.mock('../hooks/useTelegram',()=>({useBackButton:()=>{},useTelegram:()=>({})}));
beforeEach(()=>{
 localStorage.clear();api.clearStoredTokens();chooseCourse('en-ru');auth.role='user';
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Test network disabled')));
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:vi.fn()});
});
afterEach(()=>{cleanup();api.clearStoredTokens();localStorage.clear();chooseCourse('bua-ru');vi.restoreAllMocks();vi.unstubAllGlobals();});
const store=(id:string)=>({state:{selectedWordId:id,stats:{learnedWords:[]}},goBack:vi.fn(),navigateToWord:vi.fn()}) as unknown as Parameters<typeof WordDetailScreen>[0]['store'];
it('unknown course word opens a missing-word notice, no blocked network call',async()=>{
 render(<ThemeProvider themeId="light"><WordDetailScreen store={store('unknown-server-word')}/></ThemeProvider>);
 expect(await screen.findByText(/Слово не найдено в этом курсе/)).toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();
});
it.each(['user','admin'])('English card hides Buryat comments, report, editing and uploads from %s',async role=>{
 auth.role=role;api.setStoredTokens({access_token:`test.${btoa(JSON.stringify({sub:'fixture'}))}.fixture`,refresh_token:'fixture'});chooseCourse('en-ru');
 render(<ThemeProvider themeId="light"><WordDetailScreen store={store(courseWords()[0].id)}/></ThemeProvider>);
 await screen.findAllByText(courseWords()[0].ru);
 expect(screen.queryByRole('button',{name:/Предложить свою озвучку/})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Сообщить о проблеме/})).not.toBeInTheDocument();
 expect(screen.queryByPlaceholderText(/комментарий/i)).not.toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();
});
it('guest My profile works in English',async()=>{
 render(<ThemeProvider themeId="light"><ProfileScreen store={{goBack:vi.fn(),navigate:vi.fn()} as unknown as Parameters<typeof ProfileScreen>[0]['store']}/></ThemeProvider>);
 await waitFor(()=>expect(screen.queryByText(/Загрузка/)).not.toBeInTheDocument());expect(screen.queryByText(/Профили других игроков доступны/)).not.toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();
});
it('word can be submitted when optional categories are unavailable',async()=>{
 chooseCourse('bua-ru');const submit=vi.fn().mockResolvedValue({_id:'local-fixture'});
 const view=render(<ThemeProvider themeId="light"><AddWordForm onSubmit={submit} categories={[]} categoriesLoading={false} dialects={[]} dialectsLoading={false} partsOfSpeech={[]} partsOfSpeechLoading={false}/></ThemeProvider>);
 fireEvent.change(screen.getByPlaceholderText('Например: наран'),{target:{value:'ТЕСТ'}});fireEvent.change(screen.getByPlaceholderText('Например: Солнце'),{target:{value:'test'}});fireEvent.submit(view.container.querySelector('form')!);
 await waitFor(()=>expect(submit).toHaveBeenCalledWith({bur:'ТЕСТ',ru:'test'}));expect(await screen.findByText(/Слово сохранено на устройстве/)).toBeInTheDocument();
});
it.each(['en-ru','cs-ru'] as const)('%s gates every Buryat-only route and preserves learning routes',course=>{
 chooseCourse(course);for(const page of ['community','loreArticle','contribute','leaderboard','admin','adminCampaign','broadcast','adminLevelEditor','adminDailyWord','adminCampaignMaps','adminDictionary','adminVoiceStudio','adminWordReview'])expect(canOpenCourseScreen(page)).toBe(false);
 for(const page of ['menu','dictionary','wordDetail','textbook','bookChapter','settings','profile','game'])expect(canOpenCourseScreen(page)).toBe(true);
 expect(supportsWordCommunity('1234567890abcdef12345678')).toBe(false);
});
it('Buryat server words retain community functionality, local-only IDs do not',()=>{
 chooseCourse('bua-ru');expect(canOpenCourseScreen('adminDictionary')).toBe(true);expect(supportsWordCommunity('1234567890abcdef12345678')).toBe(true);expect(supportsWordCommunity('local-fixture')).toBe(false);
});
