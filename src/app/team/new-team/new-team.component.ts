// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../../message.service';
import { TeamsService } from '../teams.service';
import { ToolbarService } from '../../toolbar.service';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';

@Component({
  selector: 'app-new-team',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormField, MatInput, MatButton, MatLabel, MatCard, MatError],
  templateUrl: './new-team.component.html',
  styleUrls: ['./new-team.component.scss'],
})
export class NewTeamComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  teamForm: FormGroup;
  // teamForm: FormGroup = this.fb.group({
  //   id: [{ value: '', disabled: true }],
  //   name: ['', [Validators.required, Validators.minLength(3)]],
  //   members: this.fb.array([]),
  // });
  private subscriptions = new Subscription();
  nameError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
  ) {
    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]],
      members: this.fb.array([]),
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

  ngOnInit(): void {
    this.messageService.clearMessages();
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
  }

  // get members(): FormArray {
  //   return this.teamForm.get('members') as FormArray;
  // }

  createTeam() {
    if (this.teamForm.valid) {
      const { name } = this.teamForm.getRawValue();
      this.subscriptions.add(
        this.teamsService.createTeam(name).subscribe({
          next: (created) => {
            this.messageService.success('Team created successfully');
            this.router.navigate(['/team', created.team.uuid]);
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
    this.toolbarService.clearToolbarComponent();
  }
}
