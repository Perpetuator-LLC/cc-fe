// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from '../../message.service';
import { SocialsService } from '../../socials/socials.service';
import { BlogsService } from '../../blogs/blogs.service';
import { UserSettingsService } from '../../shared/services/user-settings.service';
import { GenerateContentDialogComponent } from './generate-content-dialog.component';

interface SetupOverrides {
  accounts?: Observable<unknown>;
  templates?: Observable<unknown>;
  blogList?: Observable<unknown>;
}

describe('GenerateContentDialogComponent', () => {
  let close: jasmine.Spy;
  let error: jasmine.Spy;
  let setLastSocialAccountUuid: jasmine.Spy;
  let setLastBlogUuid: jasmine.Spy;

  function setup(over: SetupOverrides = {}): ComponentFixture<GenerateContentDialogComponent> {
    TestBed.resetTestingModule();
    close = jasmine.createSpy('close');
    error = jasmine.createSpy('error');
    setLastSocialAccountUuid = jasmine.createSpy('setLastSocialAccountUuid');
    setLastBlogUuid = jasmine.createSpy('setLastBlogUuid');
    TestBed.configureTestingModule({
      imports: [GenerateContentDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { episodeUuid: 'ep-1', episodeTitle: 'My Episode', episodeContent: 'body' },
        },
        {
          provide: SocialsService,
          useValue: {
            getSocialAccounts: () => over.accounts ?? of([]),
            getBroadcastTemplates: () => over.templates ?? of([]),
          },
        },
        { provide: BlogsService, useValue: { getBlogs: () => over.blogList ?? of([]) } },
        { provide: MessageService, useValue: { error, success: jasmine.createSpy('success') } },
        {
          provide: UserSettingsService,
          useValue: {
            getLastSocialAccountUuid: () => of(null),
            getLastBlogUuid: () => of(null),
            setLastSocialAccountUuid,
            setLastBlogUuid,
          },
        },
      ],
    });
    return TestBed.createComponent(GenerateContentDialogComponent);
  }

  it('maps platforms to icons with a share fallback', () => {
    const c = setup().componentInstance;
    expect(c.getPlatformIcon('TWITTER')).toBe('alternate_email');
    expect(c.getPlatformIcon('LINKEDIN')).toBe('work');
    expect(c.getPlatformIcon('BLUESKY')).toBe('cloud');
    expect(c.getPlatformIcon('MYSPACE')).toBe('share');
  });

  it('seeds the article title from the episode and closes on cancel', () => {
    const c = setup().componentInstance;
    expect(c.articleForm.get('title')?.value).toBe('My Episode');
    c.onCancel();
    expect(close).toHaveBeenCalled();
  });

  it('records the last-used social account and blog selections', () => {
    const c = setup().componentInstance;
    c.onSocialAccountSelected('acct-1');
    expect(setLastSocialAccountUuid).toHaveBeenCalledWith('acct-1');
    c.onSocialAccountSelected('');
    expect(setLastSocialAccountUuid).toHaveBeenCalledTimes(1);

    c.onBlogSelected('blog-1');
    expect(setLastBlogUuid).toHaveBeenCalledWith('blog-1');
    c.onBlogSelected('');
    expect(setLastBlogUuid).toHaveBeenCalledTimes(1);
  });

  it('auto-selects the only social account and enriches it with an icon', () => {
    const fixture = setup({ accounts: of([{ id: 'a1', platform: 'TWITTER' }]) });
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.socialAccounts.length).toBe(1);
    expect(c.socialAccounts[0].platformIcon).toBe('alternate_email');
    expect(c.socialForm.get('socialAccountUuid')?.value).toBe('a1');
    expect(c.loadingAccounts).toBeFalse();
  });

  it('filters templates to the selected account platform', () => {
    const fixture = setup({
      accounts: of([{ id: 'a1', platform: 'TWITTER' }]),
      templates: of([
        { id: 't1', platform: 'TWITTER' },
        { id: 't2', platform: 'LINKEDIN' },
      ]),
    });
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.socialForm.patchValue({ socialAccountUuid: 'a1' });
    expect(c.selectedAccountTemplates.length).toBe(1);
    expect(c.selectedAccountTemplates[0].id).toBe('t1');
  });

  it('reports an error when social-account loading fails', () => {
    const fixture = setup({ accounts: throwError(() => new Error('boom')) });
    fixture.detectChanges();
    expect(error).toHaveBeenCalledWith('Failed to load social accounts: boom');
    expect(fixture.componentInstance.loadingAccounts).toBeFalse();
  });
});
