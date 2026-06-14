// Copyright (c) 2026 Perpetuator LLC
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AffiliateStorageService } from './affiliate-storage.service';

describe('AffiliateStorageService (browser)', () => {
  let service: AffiliateStorageService;

  beforeEach(() => {
    localStorage.removeItem('pending_affiliate_code');
    localStorage.removeItem('pending_return_url');
    TestBed.configureTestingModule({});
    service = TestBed.inject(AffiliateStorageService);
  });

  afterEach(() => {
    localStorage.removeItem('pending_affiliate_code');
    localStorage.removeItem('pending_return_url');
  });

  it('stores, reads and clears the affiliate code', () => {
    expect(service.getAffiliateCode()).toBeNull();
    expect(service.hasAffiliateCode()).toBeFalse();

    service.setAffiliateCode('FRIEND-42');
    expect(service.getAffiliateCode()).toBe('FRIEND-42');
    expect(service.hasAffiliateCode()).toBeTrue();

    service.clearAffiliateCode();
    expect(service.getAffiliateCode()).toBeNull();
  });

  it('stores, reads and clears the return URL', () => {
    expect(service.getReturnUrl()).toBeNull();
    expect(service.hasReturnUrl()).toBeFalse();

    service.setReturnUrl('/pricing');
    expect(service.getReturnUrl()).toBe('/pricing');
    expect(service.hasReturnUrl()).toBeTrue();

    service.clearReturnUrl();
    expect(service.getReturnUrl()).toBeNull();
  });
});

describe('AffiliateStorageService (server)', () => {
  let service: AffiliateStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    service = TestBed.inject(AffiliateStorageService);
  });

  it('never touches storage outside the browser', () => {
    const setItem = spyOn(Storage.prototype, 'setItem');
    service.setAffiliateCode('FRIEND-42');
    service.setReturnUrl('/pricing');
    service.clearAffiliateCode();
    service.clearReturnUrl();
    expect(setItem).not.toHaveBeenCalled();
    expect(service.getAffiliateCode()).toBeNull();
    expect(service.getReturnUrl()).toBeNull();
    expect(service.hasAffiliateCode()).toBeFalse();
    expect(service.hasReturnUrl()).toBeFalse();
  });
});
