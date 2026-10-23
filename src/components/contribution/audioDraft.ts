export interface AudioDraft { blob: Blob; url: string; fileName: string; }
export function releaseAudioDraft(draft: AudioDraft | null): void {
  if (draft) URL.revokeObjectURL(draft.url);
}
