// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NewsListComponent } from './news-list.component';
import { provideMockApollo, provideMockOAuthService, provideMockToolbarService } from '../../testing/test-providers';

describe('NewsComponent', () => {
  let component: NewsListComponent;
  let fixture: ComponentFixture<NewsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideMockApollo(), provideMockOAuthService(), provideMockToolbarService()],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
