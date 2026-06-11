// Copyright (c) 2026 Perpetuator LLC
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    service = new LoadingService();
  });

  it('starts not loading', () => {
    expect(service.loading()).toBeFalse();
  });

  it('show() and hide() toggle the loading signal', () => {
    service.show();
    expect(service.loading()).toBeTrue();
    service.hide();
    expect(service.loading()).toBeFalse();
  });

  it('setLoading sets the state directly', () => {
    service.setLoading(true);
    expect(service.loading()).toBeTrue();
    service.setLoading(false);
    expect(service.loading()).toBeFalse();
  });
});
