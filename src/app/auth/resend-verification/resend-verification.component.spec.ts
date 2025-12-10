// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResendVerificationComponent } from './resend-verification.component';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarService } from '../../layout/toolbar.service';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ViewContainerRef } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from '../../message.service';

describe('ResendVerificationComponent', () => {
  let component: ResendVerificationComponent;
  let fixture: ComponentFixture<ResendVerificationComponent>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;
  let toolbarServiceMock: jasmine.SpyObj<ToolbarService>;
  let viewContainerRefMock: jasmine.SpyObj<ViewContainerRef>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let activatedRouteMock: jasmine.SpyObj<ActivatedRoute>;

  beforeEach(async () => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['forgot', 'getErrors', 'resend']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    toolbarServiceMock = jasmine.createSpyObj('ToolbarService', ['setToolbarTemplate', 'clearToolbarComponent']);
    viewContainerRefMock = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    mockMessageService = jasmine.createSpyObj('MessageService', [
      'addMessage',
      'clearMessages',
      'removeMessage',
      'messageCount',
    ]);
    mockMessageService.messages$ = of([]);

    activatedRouteMock = jasmine.createSpyObj('ActivatedRoute', ['snapshot', 'queryParams']);
    activatedRouteMock.queryParams = of({});

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, NoopAnimationsModule, ResendVerificationComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToolbarService, useValue: toolbarServiceMock },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResendVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with an email control and validators', () => {
    const emailControl = component.resendForm.get('email');
    expect(emailControl).toBeTruthy();
    expect(emailControl?.hasValidator(Validators.required)).toBeTrue();
    expect(emailControl?.hasValidator(Validators.email)).toBeTrue();
  });

  it('should render the toolbar template in ngAfterViewInit', () => {
    fixture.detectChanges();
    expect(toolbarServiceMock.getViewContainerRef).toHaveBeenCalled();
    expect(viewContainerRefMock.clear).toHaveBeenCalled();
    expect(viewContainerRefMock.createEmbeddedView).toHaveBeenCalledWith(component.toolbarTemplate);
  });

  it('should call authService.resend and navigate to login on successful submission', () => {
    authServiceMock.resend.and.returnValue(of(null));

    component.onSubmit();

    expect(authServiceMock.resend).toHaveBeenCalledWith(component.resendForm.value.email as string);
  });

  it('should handle errors and not navigate on failed submission', () => {
    const errorResponse = 'A special error occurred';
    authServiceMock.resend.and.returnValue(throwError(() => new Error(errorResponse)));

    component.onSubmit();

    expect(authServiceMock.resend).toHaveBeenCalledWith(component.resendForm.value.email as string);
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(mockMessageService.addMessage).toHaveBeenCalled();
  });
});
