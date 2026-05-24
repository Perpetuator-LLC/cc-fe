// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AffiliateProfile } from '../../affiliate.service';

/** Renders the Stripe Connect onboarding/status card on the affiliate dashboard. */
@Component({
  selector: 'app-stripe-status-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './stripe-status-card.component.html',
  styleUrls: ['./stripe-status-card.component.scss'],
})
export class StripeStatusCardComponent {
  @Input({ required: true }) profile!: AffiliateProfile;

  @Output() startOnboarding = new EventEmitter<void>();
  @Output() continueOnboarding = new EventEmitter<void>();
  @Output() skipSetup = new EventEmitter<void>();
  @Output() openDashboard = new EventEmitter<void>();

  get payoutsLabel(): string {
    return this.profile.stripePayoutsEnabled ? 'Enabled' : 'Disabled';
  }
}
