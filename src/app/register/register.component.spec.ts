// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['getViewContainerRef']);
    const mockViewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef);
    mockAuthService = jasmine.createSpyObj('AuthService', ['register', 'getErrors']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockMessageService = jasmine.createSpyObj('MessageService', [
      'addMessage',
      'clearMessages',
      'removeMessage',
      'messageCount',
    ]);
    mockMessageService.messages$ = of([]);
    const mockActivatedRoute = { snapshot: { queryParams: of({}) } };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        FormBuilder,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AuthService.register when the form is valid and submitted', () => {
    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      acceptTerms: true,
    });

    const mockToken = {
      access: 'access-token',
      refresh: 'refresh-token',
    };
    mockAuthService.register.and.returnValue(of(mockToken));
    component.onSubmit();
    expect(mockAuthService.register).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/charts']);
  });

  it('should display an error when registration fails', () => {
    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      acceptTerms: true,
    });

    const mockError = 'Registration failed: mock error';
    mockAuthService.register.and.returnValue(throwError(() => new Error(mockError)));
    component.onSubmit();
    expect(mockMessageService.addMessage).toHaveBeenCalled();
  });

  it('should not call AuthService.register if the form is invalid', () => {
    // Arrange
    component.registerForm.setValue({
      email: 'invalid-email',
      password: '123',
      acceptTerms: true,
    });
    component.onSubmit();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });
});
