// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MatCard } from '@angular/material/card';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-create-team-dialog',
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
    MatDialogModule,
  ],
  template: `
    <h2 mat-dialog-title>Create New Team</h2>
    <mat-dialog-content>
      <app-message></app-message>
      <form [formGroup]="teamForm" (ngSubmit)="createTeam()">
        <mat-form-field>
          <mat-label>Team Name</mat-label>
          <input matInput formControlName="name" required />
          @if (nameError) {
            <mat-error>{{ nameError }}</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="cancel-btn" mat-button (click)="dialogRef.close()">Cancel</button>
      <button class="saveTeamBtn" mat-flat-button color="primary" (click)="createTeam()" [disabled]="!teamForm.valid">
        Save Team
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
      .saveTeamBtn {
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
export class CreateTeamDialogComponent implements OnDestroy {
  teamForm: FormGroup;
  private subscriptions = new Subscription();
  nameError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private teamsService: TeamsService,
    public dialogRef: MatDialogRef<CreateTeamDialogComponent>,
  ) {
    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
    });

    this.teamForm.get('name')?.valueChanges.subscribe(() => {
      this.teamForm.updateValueAndValidity();
      const errors = this.teamForm.get('name')?.errors;
      if (errors) {
        if (errors['required']) {
          this.nameError = 'Team name is required';
        } else if (errors['minlength']) {
          this.nameError = 'Team name must be at least 3 characters';
        } else if (errors['pattern']) {
          this.nameError = 'Team name can only contain letters, numbers, and spaces';
        } else {
          this.nameError = 'Enter a valid team name';
        }
      } else {
        this.nameError = null;
      }
    });
  }

  createTeam() {
    if (this.teamForm.valid) {
      const { name } = this.teamForm.getRawValue();
      this.subscriptions.add(
        this.teamsService.createTeam(name).subscribe({
          next: (created) => {
            this.dialogRef.close({ team: created.team });
          },
          error: (err) => {
            this.messageService.error(`Failed to create team: ${err.message}`);
          },
        }),
      );
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
