// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { BlogsService } from '../blogs.service';
import { TeamsService } from '../../team/teams.service';
import { MessageService } from '../../message.service';

interface Team {
  uuid: string;
  name: string | null;
}

@Component({
  selector: 'app-create-blog-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './create-blog-dialog.component.html',
  styleUrl: './create-blog-dialog.component.scss',
})
export class CreateBlogDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<CreateBlogDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly blogsService = inject(BlogsService);
  private readonly teamsService = inject(TeamsService);
  private readonly messageService = inject(MessageService);

  private subscriptions = new Subscription();

  blogForm: FormGroup;
  teams: Team[] = [];
  loadingTeams = true;
  creating = false;

  constructor() {
    this.blogForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      teamUuid: ['', Validators.required],
      description: [''],
      tagline: [''],
    });
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadTeams(): void {
    this.loadingTeams = true;
    this.subscriptions.add(
      this.teamsService.getTeams().subscribe({
        next: (result) => {
          this.teams = result.teams.map((t) => ({ uuid: t.uuid, name: t.name }));
          this.loadingTeams = false;
          // Auto-select if only one team
          if (this.teams.length === 1) {
            this.blogForm.patchValue({ teamUuid: this.teams[0].uuid });
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to load teams: ${err.message}`);
          this.loadingTeams = false;
        },
      }),
    );
  }

  createBlog(): void {
    if (this.blogForm.invalid || this.creating) {
      return;
    }

    this.creating = true;
    const { name, teamUuid, description, tagline } = this.blogForm.value;

    this.subscriptions.add(
      this.blogsService
        .createBlog(name, teamUuid, {
          description: description || undefined,
          tagline: tagline || undefined,
        })
        .subscribe({
          next: (result) => {
            this.creating = false;
            if (result.success && result.blog) {
              this.messageService.success('Blog created successfully!');
              this.dialogRef.close({ blog: result.blog });
            } else {
              this.messageService.error(result.errors?.join(', ') || 'Failed to create blog');
            }
          },
          error: (err) => {
            this.creating = false;
            this.messageService.error(`Failed to create blog: ${err.message}`);
          },
        }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
