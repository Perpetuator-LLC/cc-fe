// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

interface ToneOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-pulse-settings-tab',
  standalone: true,
  imports: [
    CdkTextareaAutosize,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './pulse-settings-tab.component.html',
  styleUrl: './pulse-settings-tab.component.scss',
})
export class PulseSettingsTabComponent {
  @Input({ required: true }) pulseForm!: FormGroup;
  @Input() toneOptions: ToneOption[] = [];
  @Input() targetWords = 0;
  @Input() loadingPreferences = false;
  @Input() phoneVerified = false;

  formatDuration(value: number): string {
    return `${value} min`;
  }
}
