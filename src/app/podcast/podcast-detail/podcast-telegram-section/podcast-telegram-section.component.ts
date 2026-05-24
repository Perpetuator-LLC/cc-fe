// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Telegram publishing settings section extracted from PodcastDetail so the
 * parent template stays under the cyclomatic-complexity threshold.
 *
 * Receives the parent's FormGroup so its controls (tgBotToken, tgChannelId,
 * tgResponse) still participate in the same form lifecycle.
 */
@Component({
  selector: 'app-podcast-telegram-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatTooltipModule,
  ],
  templateUrl: './podcast-telegram-section.component.html',
  styleUrls: ['./podcast-telegram-section.component.scss'],
})
export class PodcastTelegramSectionComponent {
  @Input({ required: true }) podcastForm!: FormGroup;
  @Input({ required: true }) telegramMode!: 'cc_bot' | 'custom_bot';
  @Input({ required: true }) ccBotUsername!: string;

  @Output() telegramModeChange = new EventEmitter<'cc_bot' | 'custom_bot'>();
  @Output() refreshTelegramConnection = new EventEmitter<void>();

  get isCcBotMode(): boolean {
    return this.telegramMode === 'cc_bot';
  }

  get isCustomBotMode(): boolean {
    return this.telegramMode === 'custom_bot';
  }

  get tgResponseValue(): string | null {
    return this.podcastForm.get('tgResponse')?.value ?? null;
  }
}
