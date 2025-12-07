// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeamDetailComponent } from './team-detail.component';
import {
  provideMockApollo,
  provideMockOAuthService,
  provideMockActivatedRoute,
  provideMockToolbarService,
} from '../../testing/test-providers';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TeamDetailComponentComponent', () => {
  let component: TeamDetailComponent;
  let fixture: ComponentFixture<TeamDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamDetailComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideMockApollo(),
        provideMockOAuthService(),
        provideMockActivatedRoute({ uuid: '123' }),
        provideMockToolbarService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
