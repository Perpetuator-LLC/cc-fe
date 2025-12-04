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
    MatError,
    MatSelect,
    MatOption,
    MatOptgroup,
    MatDialogModule,
    MatIcon,
  ],
  templateUrl: './create-podcast-dialog.component.html',
  styleUrl: './create-podcast-dialog.component.scss',
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
