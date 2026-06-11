// Copyright (c) 2026 Perpetuator LLC
import { DialogDraftService } from './dialog-draft.service';

interface Draft {
  name: string;
  count: number;
}

describe('DialogDraftService', () => {
  const KEYS = ['cc_draft_podcast', 'cc_draft_pulse', 'cc_draft_recording'];
  let service: DialogDraftService;

  beforeEach(() => {
    KEYS.forEach((k) => localStorage.removeItem(k));
    service = new DialogDraftService();
  });

  afterEach(() => {
    KEYS.forEach((k) => localStorage.removeItem(k));
  });

  it('round-trips a draft', () => {
    service.saveDraft<Draft>('podcast', { name: 'My Show', count: 2 });
    expect(service.hasDraft('podcast')).toBeTrue();
    expect(service.loadDraft<Draft>('podcast')).toEqual({ name: 'My Show', count: 2 });
  });

  it('keeps drafts separate per dialog type', () => {
    service.saveDraft<Draft>('pulse', { name: 'Pulse', count: 1 });
    expect(service.hasDraft('pulse')).toBeTrue();
    expect(service.hasDraft('recording')).toBeFalse();
    expect(service.loadDraft('recording')).toBeNull();
  });

  it('returns null for a corrupted draft', () => {
    localStorage.setItem('cc_draft_recording', '{not json');
    expect(service.loadDraft('recording')).toBeNull();
  });

  it('clearDraft removes the draft', () => {
    service.saveDraft<Draft>('podcast', { name: 'X', count: 0 });
    service.clearDraft('podcast');
    expect(service.hasDraft('podcast')).toBeFalse();
    expect(service.loadDraft('podcast')).toBeNull();
  });
});
