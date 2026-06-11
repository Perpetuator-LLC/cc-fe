// Copyright (c) 2026 Perpetuator LLC
import { CreatePodcastDialogStateService, CreatePodcastFormData } from './create-podcast-dialog-state.service';

describe('CreatePodcastDialogStateService', () => {
  const draft: CreatePodcastFormData = {
    description: 'A show about markets',
    teamSelection: 'team-1',
    newTeamName: '',
    title: 'Market Pulse',
  };
  let service: CreatePodcastDialogStateService;

  beforeEach(() => {
    service = new CreatePodcastDialogStateService();
  });

  it('starts empty', () => {
    expect(service.getFormData()).toBeNull();
    expect(service.hasSavedData()).toBeFalse();
  });

  it('round-trips saved form data', () => {
    service.saveFormData(draft);
    expect(service.getFormData()).toEqual(draft);
    expect(service.hasSavedData()).toBeTrue();
  });

  it('clears saved data', () => {
    service.saveFormData(draft);
    service.clearFormData();
    expect(service.getFormData()).toBeNull();
    expect(service.hasSavedData()).toBeFalse();
  });
});
