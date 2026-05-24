// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule, MatRadioChange } from '@angular/material/radio';

export type TelegramMode = 'cc_bot' | 'custom_bot';

@Component({
  selector: 'app-telegram-mode-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatRadioModule],
  templateUrl: './telegram-mode-fields.component.html',
  styleUrl: './telegram-mode-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelegramModeFieldsComponent {
  @Input({ required: true }) socialForm!: FormGroup;
  @Input({ required: true }) telegramMode!: TelegramMode;
  @Input({ required: true }) ccBotUsername!: string;

  @Output() telegramModeChanged = new EventEmitter<TelegramMode>();

  handleTelegramModeChange(event: MatRadioChange): void {
    this.telegramModeChanged.emit(event.value as TelegramMode);
  }

  get isCcBotMode(): boolean {
    return this.telegramMode === 'cc_bot';
  }

  get isCustomBotMode(): boolean {
    return this.telegramMode === 'custom_bot';
  }
}
