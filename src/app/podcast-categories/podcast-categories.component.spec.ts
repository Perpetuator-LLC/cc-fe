// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PodcastCategoriesComponent } from './podcast-categories.component';
import { provideMockApollo, provideMockOAuthService } from '../testing/test-providers';

describe('PodcastCategoriesComponent', () => {
  let component: PodcastCategoriesComponent;
  let fixture: ComponentFixture<PodcastCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastCategoriesComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideMockApollo(), provideMockOAuthService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PodcastCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
