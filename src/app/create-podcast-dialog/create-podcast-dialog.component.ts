// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { PodcastsService } from '../podcasts.service';
import { TeamsResult, TeamsService } from '../teams.service';
import { UserService } from '../user.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MatSelect, MatOption, MatOptgroup } from '@angular/material/select';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { JobService } from '../job.service';

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
    MatError,
    MatSelect,
    MatOption,
    MatOptgroup,
    MatDialogModule,
    MatIcon,
  ],
  template: `
    <h2 mat-dialog-title>Generate Podcast</h2>
    <mat-dialog-content>
      <app-message></app-message>
      <form [formGroup]="podcastForm" (ngSubmit)="createPodcast()">
        <mat-form-field>
          <mat-label>Description (Required)</mat-label>
          <textarea
            matInput
            formControlName="description"
            required
            rows="4"
            placeholder="Describe your podcast... (e.g., 'A daily tech news podcast covering AI and startups')"
          ></textarea>
          @if (descriptionError) {
            <mat-error>{{ descriptionError }}</mat-error>
          }
        </mat-form-field>

        @if (ownedTeams.length > 0) {
          <div class="select-new">
            <span>Select Team </span>
            <button mat-stroked-button type="button" (click)="selectCreateNewTeam()">
              <mat-icon>add</mat-icon>
              Create New Team
            </button>
          </div>
          <mat-form-field>
            <mat-label>Team</mat-label>
            <mat-select formControlName="teamSelection">
              <mat-optgroup label="Your Owned Teams">
                @for (team of ownedTeams; track team.uuid) {
                  <mat-option [value]="team.uuid">{{ team.name }}</mat-option>
                }
              </mat-optgroup>
            </mat-select>
            @if (isLoadingTeams) {
              <mat-progress-spinner diameter="20" mode="indeterminate"></mat-progress-spinner>
            }
          </mat-form-field>
        }

        @if (ownedTeams.length === 0 || podcastForm.get('teamSelection')?.value === 'new') {
          <mat-form-field>
            <mat-label>New Team Name</mat-label>
            <input matInput formControlName="newTeamName" />
          </mat-form-field>
        }

        <mat-form-field>
          <mat-label>Title (Optional)</mat-label>
          <input matInput formControlName="title" placeholder="Leave blank to auto-generate from description" />
          @if (titleError) {
            <mat-error>{{ titleError }}</mat-error>
          }
        </mat-form-field>
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
        Generate Podcast
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .mat-mdc-dialog-title {
        font-size: 18px;
        font-weight: 600;
      }
      .select-new {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .select-new span {
        color: var(--theme-color);
      }
      .select-new button {
        padding: 0;
        border: 0;
        height: auto;
        color: #8f8fff;
        font-weight: 500;
      }
      mat-form-field {
        width: 100%;
        margin-bottom: 1rem;
      }
      mat-dialog-content {
        min-width: 400px;
        max-height: 70vh;
        overflow-y: auto;
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
        background: #f14a00;
        border-radius: 10px;
        color: white;
        width: 225px;
        font-size: 14px;
        font-weight: 600;
        height: 40px;
      }
      .mat-mdc-select {
        color: var(--theme-color);
      }
    `,
  ],
})
export class CreatePodcastDialogComponent implements OnInit, OnDestroy {
  podcastForm: FormGroup;
  private subscriptions = new Subscription();
  descriptionError: string | null = null;
  titleError: string | null = null;
  ownedTeams: TeamsResult[] = [];
  isLoadingTeams = true;
  private teamNameManuallyEdited = false;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private podcastsService: PodcastsService,
    private teamsService: TeamsService,
    private userService: UserService,
    public dialogRef: MatDialogRef<CreatePodcastDialogComponent>,
    private jobService: JobService,
  ) {
    this.podcastForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
      teamSelection: ['', Validators.required],
      newTeamName: [''],
      title: [''],
    });

    this.podcastForm.get('description')?.valueChanges.subscribe(() => {
      this.updateDescriptionValidation();
    });

    this.podcastForm.get('title')?.valueChanges.subscribe(() => {
      this.updateTitleValidation();
    });

    // Sync newTeamName with title unless user has manually edited it
    this.podcastForm.get('title')?.valueChanges.subscribe((titleValue) => {
      if (!this.teamNameManuallyEdited && titleValue) {
        this.podcastForm.get('newTeamName')?.setValue(titleValue, { emitEvent: false });
      }
    });

    // Track when user manually edits the team name
    this.podcastForm.get('newTeamName')?.valueChanges.subscribe(() => {
      this.teamNameManuallyEdited = true;
    });
  }

  ngOnInit(): void {
    this.messageService.clearMessages();
    this.loadOwnedTeams();
  }

  private updateDescriptionValidation(): void {
    const errors = this.podcastForm.get('description')?.errors;
    if (errors) {
      if (errors['required']) {
        this.descriptionError = 'Description is required';
      } else if (errors['minlength']) {
        this.descriptionError = 'Description must be at least 10 characters';
      } else {
        this.descriptionError = 'Enter a valid description';
      }
    } else {
      this.descriptionError = null;
    }
  }

  private updateTitleValidation(): void {
    const errors = this.podcastForm.get('title')?.errors;
    if (errors) {
      this.titleError = 'Enter a valid title';
    } else {
      this.titleError = null;
    }
  }

  loadOwnedTeams(): void {
    this.isLoadingTeams = true;
    this.subscriptions.add(
      this.teamsService.getTeams().subscribe({
        next: (response) => {
          this.ownedTeams = response.teams.filter((team) => team.members.some((member) => member.role === 'owner'));
          this.isLoadingTeams = false;

          // If no teams exist, automatically set to create new team mode
          if (this.ownedTeams.length === 0) {
            this.podcastForm.get('teamSelection')?.setValue('new');
            // Make newTeamName required when no teams exist
            this.podcastForm.get('newTeamName')?.setValidators([Validators.required]);
            this.podcastForm.get('newTeamName')?.updateValueAndValidity();

            // Set default team name to "{username}'s Team"
            const username = this.userService.userDetails()?.username;
            if (username) {
              const defaultTeamName = `${username}'s Team`;
              this.podcastForm.get('newTeamName')?.setValue(defaultTeamName, { emitEvent: false });
            }
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to load teams: ${err.message}`);
          this.isLoadingTeams = false;
        },
      }),
    );
  }

  selectCreateNewTeam(): void {
    this.podcastForm.get('teamSelection')?.setValue('new');
    this.podcastForm.get('newTeamName')?.setValidators([Validators.required]);
    this.podcastForm.get('newTeamName')?.updateValueAndValidity();

    // Reset manual edit tracking and sync with current title if exists
    this.teamNameManuallyEdited = false;
    const currentTitle = this.podcastForm.get('title')?.value;
    if (currentTitle) {
      this.podcastForm.get('newTeamName')?.setValue(currentTitle, { emitEvent: false });
    }
  }

  createPodcast(): void {
    if (this.podcastForm.valid) {
      const { description, teamSelection, newTeamName, title } = this.podcastForm.getRawValue();

      if (teamSelection === 'new') {
        const teamName = newTeamName || 'New Team';
        this.subscriptions.add(
          this.teamsService.createTeam(teamName).subscribe({
            next: (teamResult) => {
              this.generatePodcastWithTeam(description, teamResult.team.uuid, title);
            },
            error: (err) => {
              this.messageService.error(`Failed to create team: ${err.message}`);
            },
          }),
        );
      } else {
        this.generatePodcastWithTeam(description, teamSelection, title);
      }
    }
  }

  private generatePodcastWithTeam(description: string, teamUuid: string, title?: string): void {
    this.subscriptions.add(
      this.podcastsService.generatePodcast(description, teamUuid, title || undefined).subscribe({
        next: (created) => {
          this.messageService.info('Generating podcast...');
          this.jobService.addJob(created.job);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.messageService.error(`Failed to generate podcast: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
