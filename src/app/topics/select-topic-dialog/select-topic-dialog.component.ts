// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Topic } from '../research.service';

export interface SelectTopicDialogData {
  podcastUuid: string;
  topics: Topic[];
}

export interface SelectTopicDialogResult {
  topicUuid: string;
}

@Component({
  selector: 'app-select-topic-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatIcon,
    FormsModule,
  ],
  templateUrl: './select-topic-dialog.component.html',
  styleUrl: './select-topic-dialog.component.scss',
})
export class SelectTopicDialogComponent implements OnInit {
  selectedTopicUuid: string | null = null;
  filteredTopics: Topic[] = [];

  constructor(
    public dialogRef: MatDialogRef<SelectTopicDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelectTopicDialogData,
  ) {}

  ngOnInit(): void {
    // Filter topics for the selected podcast
    this.filteredTopics = this.data.topics.filter((topic) => topic.podcast.uuid === this.data.podcastUuid);

    // Auto-select if there's only one topic
    if (this.filteredTopics.length === 1) {
      this.selectedTopicUuid = this.filteredTopics[0].uuid;
    }
  }

  onCreate(): void {
    if (!this.selectedTopicUuid) {
      return;
    }

    const result: SelectTopicDialogResult = {
      topicUuid: this.selectedTopicUuid,
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
