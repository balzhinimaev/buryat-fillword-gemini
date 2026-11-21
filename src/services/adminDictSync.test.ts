import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import * as api from './api';
import { chooseCourse } from '../courses/progress';
import { progressOwner } from './progressStorage';
import * as db from './adminDictStore';
import { saveWordLocal, deleteWordLocal, pushAdminQueue, pullFullDictionary, retryWordSync } from './adminDictSync';
vi.mock('../config/offline', () => ({ OFFLINE: true, isNetOnline: () => navigator.onLine }));
const sid = '1234567890abcdef12345678';
const word = (ru='перевод'): db.EditableWord => ({bur:'ТЕСТ',ru,synonyms:[],antonyms:[],sources:[],tags:[],status:'verified',isActiveInGame:true,difficulty:2});
const serverWord = (id=sid) => ({_id:id,...word(),dialectId:null,partOfSpeechId:null,createdAt:'2026-11-20',updatedAt:'2026-11-20',contributor:{id:'fixture',name:'Fixture'}});
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status});
const login=(owner:string)=>api.setStoredTokens({access_token:`test.${btoa(JSON.stringify({sub:owner}))}.fixture`,refresh_token:'fixture'});
const deferred=()=>{let resolve!:(r:Response)=>void;const promise=new Promise<Response>(r=>{resolve=r;});return {promise,resolve};};
let request: ReturnType<typeof vi.fn<(url:string,options?:RequestInit)=>Promise<Response>>>;
let owner:string;
beforeEach(()=>{
 localStorage.clear(); owner=`test-${crypto.randomUUID()}`;login(owner);chooseCourse('bua-ru');vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
 request=vi.fn(async()=>{throw new Error('Unexpected test request');});
 vi.stubGlobal('fetch',vi.fn(async(url:string,options?:RequestInit)=>{
  if(url.endsWith('/auth/me'))return json({id:owner,role:'admin',name:'Fixture'});
  return request(url,options);
 }));
});
afterEach(()=>{api.clearStoredTokens();chooseCourse('bua-ru');vi.restoreAllMocks();vi.unstubAllGlobals();});
async function edited(){await db.putWordRecord({key:sid,serverId:sid,word:word(),dirty:'none'});await saveWordLocal(sid,word('правка'));}
it('normalizes populated category/dialect and preserves PATCH fields',()=>{
 const record=db.apiWordToRecord({...serverWord(),categoryId:{_id:'category',name:'Test',slug:'test'},dialectId:{_id:'dialect',name:'test',code:'test'}} as api.ApiWordDetail);
 expect(record.word.categoryId).toBe('category');expect(db.recordToUpdateRequest(record)).toMatchObject({dialectId:'dialect',categoryId:'category',status:'verified'});
});
it('edits/deletes a local draft atomically, while server deletion is a tombstone',async()=>{
 const key=await saveWordLocal(null,word());await saveWordLocal(key,word('новое'));expect((await db.getWordRecord(key))?.dirty).toBe('created');await deleteWordLocal(key);expect(await db.getWordRecord(key)).toBeUndefined();
 await edited();await deleteWordLocal(sid);expect((await db.getWordRecord(sid))?.dirty).toBe('deleted');
});
it('owner namespaces prevent another account sending/seeing a draft',async()=>{
 await saveWordLocal(null,word());login('other-fixture');chooseCourse('bua-ru');expect(await db.getAllWords()).toEqual([]);await pushAdminQueue();expect(request).not.toHaveBeenCalled();expect(await db.getDirtyWords(owner)).toHaveLength(1);
});
it.each(['en-ru','cs-ru'] as const)('%s never changes retry counters or calls server',async course=>{
 await edited();chooseCourse(course);for(let i=0;i<4;i++)expect(await pushAdminQueue()).toMatchObject({reason:'course'});expect(request).not.toHaveBeenCalled();expect((await db.getWordRecord(sid))?.attempts).toBe(0);
});
it('creates once, binds server id and marks clean',async()=>{
 const key=await saveWordLocal(null,word());request.mockResolvedValue(json({_id:sid,status:'verified'}));expect(await pushAdminQueue()).toMatchObject({pushed:1,remaining:0});expect(await db.getWordRecord(key)).toBeUndefined();expect(await db.getWordRecord(sid)).toMatchObject({serverId:sid,dirty:'none'});expect(request).toHaveBeenCalledTimes(1);
});
it('coalesces two simultaneous pushes',async()=>{
 await edited();const pending=deferred();request.mockImplementation(()=>pending.promise);const a=pushAdminQueue(),b=pushAdminQueue();await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));pending.resolve(json({}));await Promise.all([a,b]);expect(request).toHaveBeenCalledTimes(1);
});
it.each([200,500])('response %i cannot overwrite a newer local edit',async status=>{
 await edited();const pending=deferred();request.mockImplementation(()=>pending.promise);const work=pushAdminQueue();await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));await saveWordLocal(sid,word('самая новая'));pending.resolve(json({message:'failure'},status));await work;
 expect(await db.getWordRecord(sid)).toMatchObject({dirty:'updated',word:{ru:'самая новая'},attempts:0});
});
it('POST followed by failed status PATCH keeps server id and retries PATCH, not POST',async()=>{
 const key=await saveWordLocal(null,{...word(),status:'pending'});
 request.mockResolvedValueOnce(json({_id:sid,status:'verified'})).mockResolvedValueOnce(json({message:'try later'},500));expect(await pushAdminQueue()).toMatchObject({failed:1,remaining:1});expect(await db.getWordRecord(key)).toBeUndefined();expect(await db.getWordRecord(sid)).toMatchObject({dirty:'updated',serverId:sid});
 request.mockResolvedValue(json({}));await pushAdminQueue();expect(request.mock.calls.filter(([,o])=>o?.method==='POST')).toHaveLength(1);expect((await db.getWordRecord(sid))?.dirty).toBe('none');
});
it('new edit during POST survives server rekeying',async()=>{
 const key=await saveWordLocal(null,word());const pending=deferred();request.mockImplementation(()=>pending.promise);const work=pushAdminQueue();await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));await saveWordLocal(key,word('новая во время создания'));pending.resolve(json({_id:sid,status:'verified'}));await work;expect(await db.getWordRecord(sid)).toMatchObject({dirty:'updated',word:{ru:'новая во время создания'}});
});
it('deletion during POST becomes a server tombstone',async()=>{
 const key=await saveWordLocal(null,word());const pending=deferred();request.mockImplementation(()=>pending.promise);const work=pushAdminQueue();await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));await deleteWordLocal(key);pending.resolve(json({_id:sid,status:'verified'}));await work;expect((await db.getWordRecord(sid))?.dirty).toBe('deleted');
});
it('owner change stops remaining mutations and requires review of uncertain response',async()=>{
 await edited();await saveWordLocal(null,word());const pending=deferred();request.mockImplementation(()=>pending.promise);const work=pushAdminQueue();await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));login('other-fixture');chooseCourse('bua-ru');pending.resolve(json({_id:sid}));expect(await work).toMatchObject({reason:'account-change'});expect(request).toHaveBeenCalledTimes(1);expect((await db.getDirtyWords(owner)).some(r=>r.needsReview)).toBe(true);expect(await db.getAllWords()).toEqual([]);
});
it('pull honors edits made while a page was loading and removes only clean stale entries',async()=>{
 await db.putWordRecord({key:sid,serverId:sid,word:word(),dirty:'none'});await db.putWordRecord({key:'stale',serverId:'stale',word:word(),dirty:'none'});
 const pending=deferred();request.mockImplementation((url)=>url.includes('/words')?pending.promise:Promise.resolve(json([])));const work=pullFullDictionary();await waitFor(()=>expect(request.mock.calls.some(([u])=>u.includes('/words'))).toBe(true));await saveWordLocal(sid,word('правка во время скачивания'));pending.resolve(json({words:[serverWord()],total:1}));
 expect(await work).toMatchObject({skippedDirty:1,removedStale:1});expect((await db.getWordRecord(sid))?.word.ru).toBe('правка во время скачивания');expect(await db.getWordRecord('stale')).toBeUndefined();
});
it('four transient failures preserve the dirty record and manual retry clears stale error',async()=>{
 await edited();request.mockImplementation(async()=>json({message:'temporary'},500));for(let i=0;i<4;i++)await pushAdminQueue();expect(await db.getWordRecord(sid)).toMatchObject({dirty:'updated',attempts:4,syncError:'temporary'});await retryWordSync(sid);expect((await db.getWordRecord(sid))?.syncError).toBeUndefined();
});
it('DELETE 404 is successful, missing auth never sends',async()=>{
 await edited();await deleteWordLocal(sid);request.mockResolvedValue(json({message:'missing'},404));await pushAdminQueue();expect(await db.getWordRecord(sid)).toBeUndefined();api.clearStoredTokens();expect(await pushAdminQueue()).toMatchObject({reason:'auth'});
});
it('unowned legacy edits are not auto-sent; selected recovery leaves original backup',async()=>{
 const key=`old-${crypto.randomUUID()}`;const record:db.LocalWordRecord={key,word:word(),dirty:'created',attempts:3,syncError:'old course error'};await db.putWordRecord(record,'__legacy__');await pushAdminQueue();expect(request).not.toHaveBeenCalled();expect(await db.getWordRecord(key)).toBeUndefined();await db.claimLegacyAdminDrafts([key]);expect(await db.getWordRecord(key)).toMatchObject({dirty:'created',attempts:0});expect(await db.getWordRecord(key,'__legacy__')).toEqual(record);expect((await db.unclaimedAdminDrafts()).some(r=>r.key===key)).toBe(false);expect(progressOwner()).toBe(owner);
});
it('legacy recovery does not hide or overwrite a conflicting newer edit',async()=>{
 const key=`old-${crypto.randomUUID()}`;await db.putWordRecord({key,word:word('старая'),dirty:'created'},'__legacy__');await db.putWordRecord({key,word:word('новая'),dirty:'created'});await expect(db.claimLegacyAdminDrafts([key])).rejects.toThrow('уже есть новая правка');expect((await db.getWordRecord(key))?.word.ru).toBe('новая');expect((await db.unclaimedAdminDrafts()).some(r=>r.key===key)).toBe(true);
});
