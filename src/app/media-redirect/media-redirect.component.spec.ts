// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MediaTabPreferenceService } from '../layout/media-tab-preference.service';
import { MediaRedirectComponent } from './media-redirect.component';

describe('MediaRedirectComponent', () => {
  let fixture: ComponentFixture<MediaRedirectComponent>;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    navigate = jasmine.createSpy('navigate');
    await TestBed.configureTestingModule({
      imports: [MediaRedirectComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: MediaTabPreferenceService, useValue: { getPreferredTab: () => 'news' } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MediaRedirectComponent);
  });

  it('redirects to the preferred media tab on init', () => {
    fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/media', 'news'], { replaceUrl: true });
  });
});
