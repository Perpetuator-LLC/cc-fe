// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PulseConfig } from '../../../pulses.types';
import { PulseDetailHeaderComponent } from './pulse-detail-header.component';

describe('PulseDetailHeaderComponent', () => {
  let fixture: ComponentFixture<PulseDetailHeaderComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PulseDetailHeaderComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(PulseDetailHeaderComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.pulseConfig = { name: 'Tech Pulse', description: '' } as PulseConfig;
  });

  it('renders the config name with a description fallback', () => {
    fixture.detectChanges();
    expect(element.querySelector('h1')?.textContent).toContain('Tech Pulse');
    expect(element.querySelector('.header-text p')?.textContent).toContain('No description');
  });

  it('emits generatePulse and disables the button while generating', () => {
    const generated = jasmine.createSpy('generatePulse');
    fixture.componentInstance.generatePulse.subscribe(generated);
    fixture.detectChanges();

    const button = element.querySelector<HTMLButtonElement>('.header-actions button')!;
    expect(button.disabled).toBeFalse();
    button.click();
    expect(generated).toHaveBeenCalled();

    fixture.componentInstance.generatingPulse = true;
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    expect(element.querySelector('mat-spinner')).toBeTruthy();
  });
});
