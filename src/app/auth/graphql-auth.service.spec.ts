// Copyright (c) 2025-2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { GraphqlAuthService } from './graphql-auth.service';
import { MessageService } from '../message.service';
import { OAuthService } from './oauth.service';

describe('GraphqlAuthService', () => {
  let service: GraphqlAuthService;
  let apollo: jasmine.SpyObj<Apollo>;
  let messageService: jasmine.SpyObj<MessageService>;
  let oauthService: jasmine.SpyObj<OAuthService>;

  beforeEach(() => {
    localStorage.clear();
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['mutate', 'query']);
    messageService = jasmine.createSpyObj<MessageService>('MessageService', ['clearMessages', 'addMessage']);
    oauthService = jasmine.createSpyObj<OAuthService>('OAuthService', ['loginWithPassword']);
    TestBed.configureTestingModule({
      providers: [
        GraphqlAuthService,
        { provide: Apollo, useValue: apollo },
        { provide: MessageService, useValue: messageService },
        { provide: OAuthService, useValue: oauthService },
      ],
    });
    service = TestBed.inject(GraphqlAuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('forgot', () => {
    it('returns true and posts info on success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { requestPasswordReset: { success: true, message: 'sent' } } } as any));
      service.forgot('a@b.test').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'info' }));
        done();
      });
    });

    it('returns false on !success response', (done) => {
      apollo.mutate.and.returnValue(of({ data: { requestPasswordReset: { success: false, message: 'no' } } } as any));
      service.forgot('a@b.test').subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });

    it('returns false on error and posts error message', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('boom')));
      spyOn(console, 'error');
      service.forgot('a@b.test').subscribe((ok) => {
        expect(ok).toBeFalse();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'error' }));
        done();
      });
    });
  });

  describe('login', () => {
    it('delegates to OAuthService.loginWithPassword on the happy path', (done) => {
      oauthService.loginWithPassword.and.returnValue(of(true));
      service.login('a@b.test', 'pw').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(oauthService.loginWithPassword).toHaveBeenCalledWith('a@b.test', 'pw');
        done();
      });
    });

    it('returns false and posts error when OAuth fails', (done) => {
      oauthService.loginWithPassword.and.returnValue(throwError(() => new Error('bad creds')));
      spyOn(console, 'error');
      service.login('a@b.test', 'pw').subscribe((ok) => {
        expect(ok).toBeFalse();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'error' }));
        done();
      });
    });
  });

  describe('resend', () => {
    it('returns true and posts success message', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { resendVerificationEmail: { success: true, message: 'sent' } } } as any),
      );
      service.resend('a@b.test').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'success' }));
        done();
      });
    });

    it('returns false on !success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { resendVerificationEmail: { success: false } } } as any));
      service.resend('a@b.test').subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });

    it('returns false on error', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('boom')));
      spyOn(console, 'error');
      service.resend('a@b.test').subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });
  });

  describe('verify', () => {
    it('returns true when verification reports success and user', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { verifyEmail: { success: true, message: 'ok', user: { id: 'u1' } } } } as any),
      );
      service.verify('tok').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'success' }));
        done();
      });
    });

    it('returns false when verification reports !success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { verifyEmail: { success: false, message: 'bad token' } } } as any));
      service.verify('tok').subscribe((ok) => {
        expect(ok).toBeFalse();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'error' }));
        done();
      });
    });

    it('returns false on error', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('boom')));
      spyOn(console, 'error');
      service.verify('tok').subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });
  });

  describe('register', () => {
    it('writes cookie consent and shows info message when verificationEmailSent', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { register: { success: true, verificationEmailSent: true, message: 'check email' } } } as any),
      );
      service.register('a@b.test', 'pw', true).subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(localStorage.getItem('cookie_consent')).toContain('"accepted":true');
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'info' }));
        done();
      });
    });

    it('does NOT write cookie consent when acceptTerms is false', (done) => {
      apollo.mutate.and.returnValue(
        of({ data: { register: { success: true, verificationEmailSent: true, message: 'ok' } } } as any),
      );
      service.register('a@b.test', 'pw', false).subscribe(() => {
        expect(localStorage.getItem('cookie_consent')).toBeNull();
        done();
      });
    });

    it('auto-logs in when verificationEmailSent is false', (done) => {
      apollo.mutate.and.returnValue(of({ data: { register: { success: true, verificationEmailSent: false } } } as any));
      oauthService.loginWithPassword.and.returnValue(of(true));
      service.register('a@b.test', 'pw').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(oauthService.loginWithPassword).toHaveBeenCalled();
        done();
      });
    });

    it('auto-login flow propagates false from OAuth', (done) => {
      apollo.mutate.and.returnValue(of({ data: { register: { success: true, verificationEmailSent: false } } } as any));
      oauthService.loginWithPassword.and.returnValue(of(false));
      service.register('a@b.test', 'pw').subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });

    it('returns false and shows error when register !success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { register: { success: false, message: 'email in use' } } } as any));
      service.register('a@b.test', 'pw').subscribe((ok) => {
        expect(ok).toBeFalse();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'error' }));
        done();
      });
    });

    it('returns false on error', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('500')));
      spyOn(console, 'error');
      service.register('a@b.test', 'pw').subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });
  });

  describe('me', () => {
    it('returns me on success', (done) => {
      apollo.query.and.returnValue(of({ data: { me: { id: 'u1', email: 'a@b.test' } } } as any));
      service.me().subscribe((me) => {
        expect(me).toEqual(jasmine.objectContaining({ id: 'u1' }));
        done();
      });
    });

    it('returns null when data.me is missing', (done) => {
      apollo.query.and.returnValue(of({ data: { me: null } } as any));
      service.me().subscribe((me) => {
        expect(me).toBeNull();
        done();
      });
    });

    it('returns null on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('500')));
      spyOn(console, 'error');
      service.me().subscribe((me) => {
        expect(me).toBeNull();
        done();
      });
    });
  });

  describe('resetPassword', () => {
    it('returns true on success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { resetPassword: { success: true, message: 'changed' } } } as any));
      service.resetPassword('t', 'p1', 'p1').subscribe((ok) => {
        expect(ok).toBeTrue();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'success' }));
        done();
      });
    });

    it('returns false on !success', (done) => {
      apollo.mutate.and.returnValue(of({ data: { resetPassword: { success: false, message: 'mismatch' } } } as any));
      service.resetPassword('t', 'p1', 'p2').subscribe((ok) => {
        expect(ok).toBeFalse();
        expect(messageService.addMessage).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'error' }));
        done();
      });
    });

    it('returns false on error', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('boom')));
      spyOn(console, 'error');
      service.resetPassword('t', 'p1', 'p1').subscribe((ok) => {
        expect(ok).toBeFalse();
        done();
      });
    });
  });
});
