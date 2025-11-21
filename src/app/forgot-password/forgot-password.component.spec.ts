// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarService } from '../toolbar.service';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ViewContainerRef } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from '../message.service';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;
  let toolbarServiceMock: jasmine.SpyObj<ToolbarService>;
  let viewContainerRefMock: jasmine.SpyObj<ViewContainerRef>;
  let messageServiceMock: jasmine.SpyObj<MessageService>;
  let activatedRouteMock: jasmine.SpyObj<ActivatedRoute>;

  beforeEach(async () => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['forgot', 'getErrors', 'resend']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    toolbarServiceMock = jasmine.createSpyObj('ToolbarService', ['getViewContainerRef']);
    viewContainerRefMock = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    messageServiceMock = jasmine.createSpyObj('MessageService', [
      'addMessage',
      'clearMessages',
      'removeMessage',
      'messageCount',
    ]);
    messageServiceMock.messages$ = of([]);
    activatedRouteMock = jasmine.createSpyObj('ActivatedRoute', ['snapshot', 'queryParams']);
    activatedRouteMock.queryParams = of({});
    toolbarServiceMock.getViewContainerRef.and.returnValue(viewContainerRefMock);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, NoopAnimationsModule, ForgotPasswordComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToolbarService, useValue: toolbarServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with an email control and validators', () => {
    const emailControl = component.forgotForm.get('email');
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

  it('should call authService.forgot on successful submission', () => {
    authServiceMock.forgot.and.returnValue(of({ detail: 'Password reset email sent' }));

    component.onSubmit();

    expect(authServiceMock.forgot).toHaveBeenCalledWith(component.forgotForm.value.email as string);
  });

  it('should handle errors and not navigate on failed submission', () => {
    const errorResponse = 'A special error occurred';
    authServiceMock.forgot.and.returnValue(throwError(() => new Error(errorResponse)));

    component.onSubmit();

    expect(authServiceMock.forgot).toHaveBeenCalledWith(component.forgotForm.value.email as string);
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(messageServiceMock.addMessage).toHaveBeenCalled();
  });
});
