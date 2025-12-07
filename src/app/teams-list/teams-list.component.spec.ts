// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TeamsListComponent } from './teams-list.component';
import { provideMockApollo, provideMockOAuthService, provideMockToolbarService } from '../testing/test-providers';

describe('TeamsListComponentComponent', () => {
  let component: TeamsListComponent;
  let fixture: ComponentFixture<TeamsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideMockApollo(), provideMockOAuthService(), provideMockToolbarService()],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
