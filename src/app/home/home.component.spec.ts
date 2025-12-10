// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './home.component';
import { ToolbarService } from '../layout/toolbar.service';
import { provideMockOAuthService, provideMockApollo } from '../testing/test-providers';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;

  beforeEach(async () => {
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['setToolbarTemplate', 'clearToolbarComponent']);

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [
        provideHttpClient(),
        { provide: ToolbarService, useValue: mockToolbarService },
        provideMockOAuthService(),
        provideMockApollo(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set up the toolbar with the toolbar template when logged in', () => {
    // Create a signal-like function that returns true
    const mockIsLoggedInSignal = () => true;
    // Use bracket notation to avoid TypeScript index signature errors
    (component as unknown as Record<string, unknown>)['isLoggedIn'] = mockIsLoggedInSignal;

    fixture.detectChanges();

    expect(mockToolbarService.setToolbarTemplate).toHaveBeenCalled();
  });
});
