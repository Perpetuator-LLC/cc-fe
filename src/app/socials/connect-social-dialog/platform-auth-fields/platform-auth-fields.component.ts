// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { SocialPlatform } from '../../socials.service';
import { TelegramMode, TelegramModeFieldsComponent } from '../telegram-mode-fields/telegram-mode-fields.component';

export { TelegramMode };

export interface PlatformOption {
  value: SocialPlatform;
  label: string;
  icon: string;
  requiresApiKey: boolean;
  requiresToken: boolean;
  requiresChannelId: boolean;
  hasModes: boolean;
}

@Component({
  selector: 'app-platform-auth-fields',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatRadioModule,
    TelegramModeFieldsComponent,
  ],
  templateUrl: './platform-auth-fields.component.html',
  styleUrl: './platform-auth-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformAuthFieldsComponent {
  @Input({ required: true }) platform!: PlatformOption;
  @Input({ required: true }) socialForm!: FormGroup;
  @Input({ required: true }) telegramMode!: TelegramMode;
  @Input({ required: true }) ccBotUsername!: string;

  @Output() telegramModeChanged = new EventEmitter<TelegramMode>();

  onTelegramModeChanged(mode: TelegramMode): void {
    this.telegramModeChanged.emit(mode);
  }
}
