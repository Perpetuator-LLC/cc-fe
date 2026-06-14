// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AffiliateProfile } from '../../affiliate.service';
import { StripeStatusCardComponent } from './stripe-status-card.component';

function makeProfile(over: Partial<AffiliateProfile> = {}): AffiliateProfile {
  return {
    uuid: 'aff-1',
    code: 'CODE',
    brandImageUrl: null,
    customMessage: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  } as AffiliateProfile;
}

describe('StripeStatusCardComponent', () => {
  let fixture: ComponentFixture<StripeStatusCardComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StripeStatusCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(StripeStatusCardComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('prompts for account setup when no Stripe account exists', () => {
    const started = jasmine.createSpy('startOnboarding');
    fixture.componentInstance.profile = makeProfile({ stripeAccountId: null });
    fixture.componentInstance.startOnboarding.subscribe(started);
    fixture.detectChanges();

    expect(element.querySelector('.stripe-status.not-setup')).toBeTruthy();
    element.querySelector<HTMLButtonElement>('.not-setup button')?.click();
    expect(started).toHaveBeenCalled();
  });

  it('offers continue and skip while onboarding is incomplete', () => {
    const continued = jasmine.createSpy('continueOnboarding');
    const skipped = jasmine.createSpy('skipSetup');
    fixture.componentInstance.profile = makeProfile({ stripeAccountId: 'acct_1', stripeOnboardingCompleted: false });
    fixture.componentInstance.continueOnboarding.subscribe(continued);
    fixture.componentInstance.skipSetup.subscribe(skipped);
    fixture.detectChanges();

    const buttons = element.querySelectorAll<HTMLButtonElement>('.stripe-status.incomplete button');
    expect(buttons.length).toBe(2);
    buttons[0].click();
    buttons[1].click();
    expect(continued).toHaveBeenCalled();
    expect(skipped).toHaveBeenCalled();
  });

  it('shows the active state with country and payouts label', () => {
    fixture.componentInstance.profile = makeProfile({
      stripeAccountId: 'acct_1',
      stripeOnboardingCompleted: true,
      stripePayoutsEnabled: true,
      stripeCountry: 'US',
    });
    fixture.detectChanges();

    expect(element.querySelector('.stripe-status.complete')?.textContent).toContain('Payment Account Active');
    expect(element.textContent).toContain('US');
    expect(fixture.componentInstance.payoutsLabel).toBe('Enabled');

    fixture.componentInstance.profile = makeProfile({ stripeOnboardingCompleted: true });
    expect(fixture.componentInstance.payoutsLabel).toBe('Disabled');
  });
});
