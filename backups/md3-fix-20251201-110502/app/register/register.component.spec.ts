// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { GraphqlAuthService } from '../graphql-auth.service';
import { Apollo } from 'apollo-angular';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockGraphqlAuthService: jasmine.SpyObj<GraphqlAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['getViewContainerRef']);
    const mockViewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef);
    mockGraphqlAuthService = jasmine.createSpyObj('GraphqlAuthService', ['register']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['addMessage', 'clearMessages', 'removeMessage']);
    Object.defineProperty(mockMessageService, 'messageCount', {
      get: () => 0,
      configurable: true,
    });
    mockMessageService.messages$ = of([]);
    const mockActivatedRoute = { snapshot: { queryParams: of({}) } };

    const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
    mockApollo.mutate.and.returnValue(of({ data: {} }));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: GraphqlAuthService, useValue: mockGraphqlAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Apollo, useValue: mockApollo },
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

  it('should call GraphqlAuthService.register when the form is valid and submitted', () => {
    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      acceptTerms: true,
    });

    mockGraphqlAuthService.register.and.returnValue(of(true));
    component.onSubmit();
    expect(mockGraphqlAuthService.register).toHaveBeenCalledWith('test@example.com', 'password123', true);
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('should display an error when registration fails', () => {
    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      acceptTerms: true,
    });

    const mockError = 'Registration failed: mock error';
    mockGraphqlAuthService.register.and.returnValue(throwError(() => new Error(mockError)));
    component.onSubmit();
    expect(mockMessageService.addMessage).toHaveBeenCalled();
  });

  it('should not call GraphqlAuthService.register if the form is invalid', () => {
    // Arrange
    component.registerForm.setValue({
      email: 'invalid-email',
      password: '123',
      acceptTerms: true,
    });
    component.onSubmit();
    expect(mockGraphqlAuthService.register).not.toHaveBeenCalled();
  });
});
