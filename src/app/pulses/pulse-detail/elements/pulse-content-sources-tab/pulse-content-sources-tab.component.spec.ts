// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ContentSource } from '../../../pulses.types';
import { PulseContentSourcesTabComponent } from './pulse-content-sources-tab.component';

describe('PulseContentSourcesTabComponent', () => {
  let fixture: ComponentFixture<PulseContentSourcesTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PulseContentSourcesTabComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(PulseContentSourcesTabComponent);
  });

  it('renders with no sources', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('mat-card')).toBeTruthy();
  });

  it('forwards all four actions through its outputs', () => {
    const events: string[] = [];
    const component = fixture.componentInstance;
    component.addBulkRssFeeds.subscribe(() => events.push('bulk'));
    component.addContentSource.subscribe(() => events.push('add'));
    component.editContentSource.subscribe((source) => events.push(`edit:${source.uuid}`));
    component.removeContentSource.subscribe((uuid) => events.push(`remove:${uuid}`));

    component.addBulkRssFeeds.emit();
    component.addContentSource.emit();
    component.editContentSource.emit({ uuid: 's1' } as ContentSource);
    component.removeContentSource.emit('s2');
    expect(events).toEqual(['bulk', 'add', 'edit:s1', 'remove:s2']);
  });
});
