// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { ChartInfoComponent } from './chart-info.component';

describe('ChartInfoComponent', () => {
  let fixture: ComponentFixture<ChartInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartInfoComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ChartInfoComponent);
  });

  it('renders an info button wired to the tooltip input', () => {
    fixture.componentInstance.tooltip = 'Explains the chart';
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button.chart-info-button');
    expect(button?.textContent).toContain('info_outline');
    const tooltip = fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);
    expect(tooltip.message).toBe('Explains the chart');
  });
});
