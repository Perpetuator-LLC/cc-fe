// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AlertTrigger } from '../../../pulses.types';
import { PulseAlertTriggersTabComponent } from './pulse-alert-triggers-tab.component';

describe('PulseAlertTriggersTabComponent', () => {
  let fixture: ComponentFixture<PulseAlertTriggersTabComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PulseAlertTriggersTabComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(PulseAlertTriggersTabComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the empty state and emits addAlertTrigger', () => {
    const added = jasmine.createSpy('addAlertTrigger');
    fixture.componentInstance.addAlertTrigger.subscribe(added);
    fixture.detectChanges();

    expect(element.querySelector('.empty-state')?.textContent).toContain('No alert triggers configured');
    element.querySelector<HTMLButtonElement>('.section-header button')!.click();
    expect(added).toHaveBeenCalled();
  });

  it('renders a table row per trigger', () => {
    fixture.componentInstance.alertTriggers = [
      { uuid: 't1', alertType: 'price_alert', symbol: 'AAPL' } as unknown as AlertTrigger,
      { uuid: 't2', alertType: 'breaking_news', keywords: ['fed', 'rates'] } as unknown as AlertTrigger,
    ];
    fixture.componentInstance.alertTriggerColumns = ['alertType', 'details'];
    fixture.detectChanges();

    expect(element.querySelector('.empty-state')).toBeNull();
    expect(element.querySelectorAll('tr[mat-row]').length).toBe(2);
    expect(element.textContent).toContain('AAPL');
    expect(element.textContent).toContain('fed');
  });
});
