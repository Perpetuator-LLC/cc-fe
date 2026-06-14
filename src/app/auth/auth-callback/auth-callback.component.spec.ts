// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OAuthService } from '../oauth.service';
import { AuthCallbackComponent } from './auth-callback.component';

describe('AuthCallbackComponent', () => {
  let fixture: ComponentFixture<AuthCallbackComponent>;
  let navigate: jasmine.Spy;
  let isAuthenticated: jasmine.Spy;

  beforeEach(async () => {
    navigate = jasmine.createSpy('navigate');
    isAuthenticated = jasmine.createSpy('isAuthenticated');
    await TestBed.configureTestingModule({
      imports: [AuthCallbackComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: OAuthService, useValue: { isAuthenticated } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AuthCallbackComponent);
  });

  it('redirects home once authenticated', fakeAsync(() => {
    isAuthenticated.and.returnValue(true);
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    tick(1000);
    expect(navigate).toHaveBeenCalledWith(['/']);
  }));

  it('redirects to login when not authenticated', fakeAsync(() => {
    isAuthenticated.and.returnValue(false);
    fixture.detectChanges();
    tick(1000);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  }));
});
