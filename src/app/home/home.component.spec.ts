// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './home.component';
import { ToolbarService } from '../toolbar.service';
import { provideMockOAuthService, provideMockApollo } from '../testing/test-providers';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockViewContainerRef: jasmine.SpyObj<{ clear: () => void; createEmbeddedView: (template: unknown) => void }>;

  beforeEach(async () => {
    mockViewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['getViewContainerRef']);
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef);

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

  it('should set up the toolbar with the toolbar template', () => {
    // Mock the AuthService's isLoggedIn signal to return true
    const mockIsLoggedInSignal = jasmine.createSpy('isLoggedIn').and.returnValue(true);
    (component as Record<string, unknown>).isLoggedIn = mockIsLoggedInSignal;

    fixture.detectChanges();
    // Trigger ngAfterViewInit
    component.ngAfterViewInit();

    expect(mockToolbarService.getViewContainerRef).toHaveBeenCalled();
    expect(mockViewContainerRef.clear).toHaveBeenCalled();
    expect(mockViewContainerRef.createEmbeddedView).toHaveBeenCalledWith(component.toolbarTemplate);
  });
});
