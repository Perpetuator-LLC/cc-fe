import { TestBed } from '@angular/core/testing';

import { CryptoArticleService } from './crypto-article.service';

describe('CryptoArticleService', () => {
  let service: CryptoArticleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoArticleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
