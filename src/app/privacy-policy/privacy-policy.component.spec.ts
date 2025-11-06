// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';
import { ViewContainerRef } from '@angular/core';

describe('PrivacyPolicyComponent', () => {
  let component: PrivacyPolicyComponent;
  let fixture: ComponentFixture<PrivacyPolicyComponent>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockToolbarService = jasmine.createSpyObj('ToolbarService', [
      'setTemplate',
      'clearTemplate',
      'getViewContainerRef',
      'clearToolbarComponent',
    ]);
    mockAuthService = jasmine.createSpyObj('AuthService', ['isLoggedIn']);

    const mockViewContainerRef = {
      clear: jasmine.createSpy('clear'),
      createEmbeddedView: jasmine.createSpy('createEmbeddedView'),
    };
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef as unknown as ViewContainerRef);
    mockAuthService.isLoggedIn.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyComponent],
      providers: [
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
