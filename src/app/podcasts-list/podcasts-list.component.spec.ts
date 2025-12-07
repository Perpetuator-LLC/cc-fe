// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PodcastsListComponent } from './podcasts-list.component';
import {
  provideMockApollo,
  provideMockOAuthService,
  provideMockActivatedRoute,
  provideMockToolbarService,
} from '../testing/test-providers';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TeamsListComponentComponent', () => {
  let component: PodcastsListComponent;
  let fixture: ComponentFixture<PodcastsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastsListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideMockApollo(),
        provideMockOAuthService(),
        provideMockActivatedRoute({ teamId: '123' }),
        provideMockToolbarService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PodcastsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
