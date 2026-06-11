// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Pulse } from '../../../pulses.types';
import { LatestPulseCardComponent } from './latest-pulse-card.component';

function makePulse(over: Partial<Pulse> = {}): Pulse {
  return {
    uuid: 'pulse-1',
    title: 'Morning Brief',
    transcript: 'Hello world',
    summary: 'Summary',
    audioUrl: 'https://cdn.test/p.mp3',
    audioDurationSeconds: 65,
    wordCount: 120,
    status: 'READY',
    validatedCompliance: true,
    validatedFacts: true,
    validatedLength: true,
    isValidated: true,
    isScheduled: false,
    configName: 'Config',
    deliveryMethod: 'in_app',
    playCount: 0,
    listenDurationSeconds: 0,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('LatestPulseCardComponent', () => {
  let fixture: ComponentFixture<LatestPulseCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LatestPulseCardComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(LatestPulseCardComponent);
    fixture.componentInstance.pulse = makePulse();
  });

  it('renders the pulse card', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('mat-card')).toBeTruthy();
    expect(element.textContent).toContain('Morning Brief');
  });

  it('forwards play and queue actions through its outputs', () => {
    const events: string[] = [];
    const component = fixture.componentInstance;
    component.playPulse.subscribe((pulse) => events.push(`play:${pulse.uuid}`));
    component.queueNext.subscribe((pulse) => events.push(`next:${pulse.uuid}`));
    component.queue.subscribe((pulse) => events.push(`queue:${pulse.uuid}`));
    component.toggleTranscript.subscribe(() => events.push('transcript'));

    component.playPulse.emit(component.pulse);
    component.queueNext.emit(component.pulse);
    component.queue.emit(component.pulse);
    component.toggleTranscript.emit();
    expect(events).toEqual(['play:pulse-1', 'next:pulse-1', 'queue:pulse-1', 'transcript']);
  });
});
