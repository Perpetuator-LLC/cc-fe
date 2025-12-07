// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NewPodcastComponent } from './new-podcast.component';
import { provideMockApollo, provideMockOAuthService, provideMockToolbarService } from '../testing/test-providers';

describe('NewTeamComponentComponent', () => {
  let component: NewPodcastComponent;
  let fixture: ComponentFixture<NewPodcastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewPodcastComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideMockApollo(), provideMockOAuthService(), provideMockToolbarService()],
    }).compileComponents();

    fixture = TestBed.createComponent(NewPodcastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
