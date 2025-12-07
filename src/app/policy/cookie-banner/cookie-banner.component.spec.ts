// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CookieBannerComponent } from './cookie-banner.component';
import { provideMockApollo, provideMockOAuthService, provideMockActivatedRoute } from '../../testing/test-providers';

describe('CookieBannerComponent', () => {
  let component: CookieBannerComponent;
  let fixture: ComponentFixture<CookieBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookieBannerComponent, HttpClientTestingModule],
      providers: [provideMockApollo(), provideMockOAuthService(), provideMockActivatedRoute()],
    }).compileComponents();

    fixture = TestBed.createComponent(CookieBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
