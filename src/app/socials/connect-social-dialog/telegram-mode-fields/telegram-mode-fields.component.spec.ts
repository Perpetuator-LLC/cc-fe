// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { MatRadioChange } from '@angular/material/radio';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TelegramModeFieldsComponent } from './telegram-mode-fields.component';

describe('TelegramModeFieldsComponent', () => {
  let fixture: ComponentFixture<TelegramModeFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelegramModeFieldsComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(TelegramModeFieldsComponent);
    fixture.componentInstance.socialForm = new FormGroup({
      channelId: new FormControl(''),
      accessToken: new FormControl(''),
    });
    fixture.componentInstance.telegramMode = 'cc_bot';
    fixture.componentInstance.ccBotUsername = '@cc_pulse_bot';
  });

  it('shows the CC-bot instructions with the bot username', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.isCcBotMode).toBeTrue();
    expect(fixture.componentInstance.isCustomBotMode).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('@cc_pulse_bot');
  });

  it('switches instructions in custom-bot mode', () => {
    fixture.componentInstance.telegramMode = 'custom_bot';
    fixture.detectChanges();
    expect(fixture.componentInstance.isCustomBotMode).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Add our bot');
  });

  it('emits the chosen mode on radio change', () => {
    const modes: string[] = [];
    fixture.componentInstance.telegramModeChanged.subscribe((mode) => modes.push(mode));
    fixture.componentInstance.handleTelegramModeChange({ value: 'custom_bot' } as MatRadioChange);
    expect(modes).toEqual(['custom_bot']);
  });
});
