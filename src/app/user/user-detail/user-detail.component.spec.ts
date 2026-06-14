// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserDetailComponent } from './user-detail.component';
import { UserService } from '../user.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { provideMockOAuthService, provideMockApollo } from '../../testing/test-providers';
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
      setToolbarTemplate: jasmine.createSpy('setToolbarTemplate'),
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

  describe('passwordMatchValidator', () => {
    it('flags a mismatch on the confirm control and returns the error', () => {
      const form = component.changePasswordForm;
      form.get('newPassword')?.setValue('password123');
      form.get('confirmPassword')?.setValue('different');
      const result = component.passwordMatchValidator(form);
      expect(result).toEqual({ mismatch: true });
      expect(form.get('confirmPassword')?.hasError('mismatch')).toBeTrue();
    });

    it('clears the error when the passwords match', () => {
      const form = component.changePasswordForm;
      form.get('newPassword')?.setValue('password123');
      form.get('confirmPassword')?.setValue('password123');
      expect(component.passwordMatchValidator(form)).toBeNull();
      expect(form.get('confirmPassword')?.hasError('mismatch')).toBeFalse();
    });
  });

  describe('phone-dependent SMS state', () => {
    it('treats the phone as invalid and shows guidance while no valid control is set', () => {
      expect(component.isPhoneNumberValid()).toBeFalse();
      expect(component.getLowBalanceSmsTooltip()).toContain('add a valid phone number');
    });

    it('treats a non-empty valid phone control as valid with no tooltip', () => {
      component.userDetailForm.addControl(
        'phoneNumber',
        new FormControl('+15551234567', Validators.pattern(/^\+?[1-9]\d{1,14}$/)),
      );
      expect(component.isPhoneNumberValid()).toBeTrue();
      expect(component.getLowBalanceSmsTooltip()).toBe('');
    });
  });
});
