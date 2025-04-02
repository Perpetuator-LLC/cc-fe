// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';

import { PodcastsService } from './podcasts.service';

describe('PodcastsService', () => {
  let service: PodcastsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PodcastsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
