// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../../message.service';
import { PodcastsService } from '../podcasts.service';
import { TeamsResult, TeamsService } from '../../team/teams.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatSelect, MatOption, MatOptgroup } from '@angular/material/select';

@Component({
  selector: 'app-new-podcast',
  standalone: true,
  imports: [
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,

    MatCard,
    MatError,
    MatSelect,
    MatOption,
    MatOptgroup,
  ],
  templateUrl: './new-podcast.component.html',
  styleUrls: ['./new-podcast.component.scss'],
})
export class NewPodcastComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  podcastForm: FormGroup;
  private subscriptions = new Subscription();
  nameError: string | null = null;
  ownedTeams: TeamsResult[] = [];
  isLoadingTeams = true;
  teamNameLinked = true;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService,
    private podcastsService: PodcastsService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
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
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
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
          this.router.navigate(['/p', created.podcast.uuid]);
        },
        error: (err) => {
          this.messageService.error(`Failed to create podcast: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }
}
