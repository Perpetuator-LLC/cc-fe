// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';

import { CodeService } from './code.service';

describe('BonusService', () => {
  let service: CodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
