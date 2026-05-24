// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

/**
 * Renders the podcast / pulse / episode selection or display fields for the
 * friendly schedule dialog. All visibility and naming flags are computed by
 * the parent dialog and passed in as plain inputs, so this component stays a
 * thin presentational shell.
 */
@Component({
  selector: 'app-schedule-entity-fields',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
  templateUrl: './schedule-entity-fields.component.html',
  styleUrls: ['./schedule-entity-fields.component.scss'],
})
export class ScheduleEntityFieldsComponent {
  @Input({ required: true }) form!: FormGroup;

  // Podcast
  @Input() showPodcastSelect = false;
  @Input() showPodcastDisplay = false;
  @Input() podcasts: { uuid: string; name: string }[] | undefined = [];
  @Input() selectedPodcastName = '';

  // Pulse
  @Input() showPulseSelect = false;
  @Input() showPulseDisplay = false;
  @Input() pulseConfigs: { uuid: string; name: string }[] | undefined = [];
  @Input() selectedPulseName = '';

  // Episode
  @Input() showEpisodeSelect = false;
  @Input() showEpisodeDisplay = false;
  @Input() episodes: { uuid: string; name: string; podcastName?: string }[] | undefined = [];
  @Input() episodeName: string | undefined = '';
}
