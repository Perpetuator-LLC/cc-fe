// Copyright (c) 2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MediaTabPreferenceService } from '../layout/media-tab-preference.service';

/**
 * Component that redirects to the user's preferred media tab.
 * Used as a dynamic redirect instead of a static redirectTo.
 */
@Component({
  selector: 'app-media-redirect',
  templateUrl: './media-redirect.component.html',
  standalone: true,
})
export class MediaRedirectComponent implements OnInit {
  private router = inject(Router);
  private mediaTabPreferenceService = inject(MediaTabPreferenceService);

  ngOnInit(): void {
    const preferredTab = this.mediaTabPreferenceService.getPreferredTab();
    this.router.navigate(['/media', preferredTab], { replaceUrl: true });
  }
}
