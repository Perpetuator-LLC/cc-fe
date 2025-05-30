// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { PodcastsService } from '../podcasts.service';
import { TeamsResult, TeamsService } from '../teams.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MatCard } from '@angular/material/card';
import { MatSelect, MatOption, MatOptgroup } from '@angular/material/select';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-create-podcast-dialog',
  standalone: true,
  imports: [
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,
    MessageComponent,
    MatCard,
    MatError,
    MatSelect,
    MatOption,
    MatOptgroup,
    MatDialogModule,
  ],
  template: `
    <h2 mat-dialog-title>Create New Podcast</h2>
    <mat-dialog-content>
      <app-message></app-message>
      <form [formGroup]="podcastForm" (ngSubmit)="createPodcast()">
        <mat-form-field>
          <mat-label>Podcast Name</mat-label>
          <input matInput formControlName="name" required />
          @if (nameError) {
            <mat-error>{{ nameError }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Team</mat-label>
          <mat-select formControlName="teamSelection">
            <mat-option value="new">Create New Team</mat-option>
            @if (ownedTeams.length > 0) {
              <mat-optgroup label="Your Owned Teams">
                @for (team of ownedTeams; track team.uuid) {
                  <mat-option [value]="team.uuid">{{ team.name }}</mat-option>
                }
              </mat-optgroup>
            }
          </mat-select>
          @if (isLoadingTeams) {
            <mat-progress-spinner diameter="20" mode="indeterminate"></mat-progress-spinner>
          }
        </mat-form-field>

        @if (podcastForm.get('teamSelection')?.value === 'new') {
          <mat-form-field>
            <mat-label>New Team Name</mat-label>
            <input matInput formControlName="newTeamName" (focus)="onNewTeamNameFocus()" />
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="cancel-btn" mat-button (click)="dialogRef.close()">Cancel</button>
      <button
        class="savePodcastBtn"
        mat-flat-button
        color="primary"
        (click)="createPodcast()"
        [disabled]="!podcastForm.valid"
      >
        Save Podcast
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-form-field {
        width: 100%;
        margin-bottom: 1rem;
      }
      mat-dialog-content {
        min-width: 400px;
      }
      .cancel-btn {
        background: var(--secondary-light);
        border: 1px solid var(--border-color);
        color: var(--theme-color);
        border-radius: 10px;
        width: 88px;
        height: 40px;
      }
      .savePodcastBtn {
        background: #ffffff;
        border-radius: 10px;
        color: var(--toolbar-container-background-color);
        width: 225px;
        font-size: 14px;
        font-weight: 600;
        height: 40px;
      }
    `,
  ],
})
export class CreatePodcastDialogComponent implements OnInit, OnDestroy {
  podcastForm: FormGroup;
  private subscriptions = new Subscription();
  nameError: string | null = null;
  ownedTeams: TeamsResult[] = [];
  isLoadingTeams = true;
  teamNameLinked = true;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private podcastsService: PodcastsService,
    private teamsService: TeamsService,
    public dialogRef: MatDialogRef<CreatePodcastDialogComponent>,
  ) {
    this.podcastForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
      teamSelection: ['new', Validators.required],
      newTeamName: [''],
      existingTeamId: [''],
    });

    this.podcastForm.get('name')?.valueChanges.subscribe((value) => {
      this.updateNameValidation(value);
      if (this.teamNameLinked && this.podcastForm.get('teamSelection')?.value === 'new') {
        this.podcastForm.get('newTeamName')?.setValue(value);
      }
    });
  }

  ngOnInit(): void {
    this.messageService.clearMessages();
    this.loadOwnedTeams();
  }

  private updateNameValidation(value: string): void {
    this.podcastForm.updateValueAndValidity();
    const errors = this.podcastForm.get('name')?.errors;
    if (errors) {
      if (errors['required']) {
        this.nameError = 'Podcast name is required';
      } else if (errors['minlength']) {
        this.nameError = `Podcast name must be at least 3 characters`;
      } else if (errors['pattern']) {
        this.nameError = 'Podcast name can only contain letters, numbers, and spaces';
      } else {
        this.nameError = `Enter a valid podcast name, received: ${value}`;
      }
    } else {
      this.nameError = null;
    }
  }

  loadOwnedTeams(): void {
    this.isLoadingTeams = true;
    this.subscriptions.add(
      this.teamsService.getTeams().subscribe({
        next: (response) => {
          this.ownedTeams = response.teams.filter((team) => team.members.some((member) => member.role === 'owner'));
          this.isLoadingTeams = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load teams: ${err.message}`);
          this.isLoadingTeams = false;
        },
      }),
    );
  }

  onNewTeamNameFocus(): void {
    this.teamNameLinked = false;
  }

  createPodcast(): void {
    if (this.podcastForm.valid) {
      const { name, teamSelection, newTeamName, existingTeamId } = this.podcastForm.getRawValue();

      if (teamSelection === 'new') {
        const teamName = newTeamName || name;
        this.subscriptions.add(
          this.teamsService.createTeam(teamName).subscribe({
            next: (teamResult) => {
              this.createPodcastWithTeam(name, teamResult.team.uuid);
            },
            error: (err) => {
              this.messageService.error(`Failed to create team: ${err.message}`);
            },
          }),
        );
      } else {
        this.createPodcastWithTeam(name, existingTeamId || teamSelection);
      }
    }
  }

  private createPodcastWithTeam(name: string, teamUuid: string): void {
    this.subscriptions.add(
      this.podcastsService.createPodcast(name, teamUuid).subscribe({
        next: (created) => {
          this.messageService.success('Podcast created successfully');
          this.dialogRef.close(created.podcast);
        },
        error: (err) => {
          this.messageService.error(`Failed to create podcast: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
