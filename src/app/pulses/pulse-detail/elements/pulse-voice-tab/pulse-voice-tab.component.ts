// Copyright (c) 2026 Perpetuator LLC
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Voice } from '../../../../podcast/voices.service';
import { VoiceSelectorComponent } from '../../../../shared/voice-selector/voice-selector.component';

@Component({
  selector: 'app-pulse-voice-tab',
  standalone: true,
  imports: [MatCardModule, VoiceSelectorComponent],
  templateUrl: './pulse-voice-tab.component.html',
  styleUrl: './pulse-voice-tab.component.scss',
})
export class PulseVoiceTabComponent {
  @Input() selectedVoiceUuid: string | null = null;

  @Output() voiceSelected = new EventEmitter<Voice>();
}
