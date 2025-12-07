// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserDetailComponent } from './user-detail.component';
import { UserService } from '../user.service';
import { ToolbarService } from '../toolbar.service';
import { provideMockOAuthService, provideMockApollo } from '../testing/test-providers';
import { of } from 'rxjs';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;

  beforeEach(async () => {
    const mockUserService = jasmine.createSpyObj('UserService', [
      'getUserDetails',
      'getUserPreferences',
      'loadUserDetails',
      'loadUserEmailChangePending',
    ]);
    mockUserService.getUserDetails.and.returnValue(of({}));
    mockUserService.getUserPreferences.and.returnValue(of({}));
    // loadUserDetails is a void method, not returning anything
    mockUserService.loadUserDetails.and.stub();
    mockUserService.loadUserEmailChangePending.and.returnValue(of(null));

    const mockToolbarService = {
      getViewContainerRef: jasmine.createSpy('getViewContainerRef').and.returnValue({
        clear: jasmine.createSpy('clear'),
        createEmbeddedView: jasmine.createSpy('createEmbeddedView'),
      }),
      clearToolbarComponent: jasmine.createSpy('clearToolbarComponent'),
    };

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: mockUserService },
        { provide: ToolbarService, useValue: mockToolbarService },
        provideMockOAuthService(),
        provideMockApollo(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
