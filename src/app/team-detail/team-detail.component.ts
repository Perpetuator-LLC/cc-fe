import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
import { ToolbarService } from '../toolbar.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [MatProgressSpinner, ReactiveFormsModule, MatFormField, MatInput, MatButton, MatLabel, MessageComponent],
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss'],
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  teamForm!: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loading = true;

    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: ['', Validators.required],
      members: this.fb.array([]),
    });

    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) {
      throw new Error('Failed to get Team ID for updating Team');
    }

    this.subscriptions.add(
      this.teamsService.getTeamById(teamId).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to retrieve team data: ${err.message}`,
            dismissible: true,
          });
        },
        complete: () => {
          this.loading = false;
          console.log('Retrieve team complete');
        },
      }),
    );
  }

  get members(): FormArray {
    return this.teamForm.get('members') as FormArray;
  }

  saveTeam() {
    if (this.teamForm.valid) {
      this.loading = true;
      const { id, name } = this.teamForm.getRawValue();
      console.log('Updating team:', { id, name }); // Add this line
      this.subscriptions.add(
        this.teamsService.updateTeam(id, name).subscribe({
          next: () => {
            this.messageService.addMessage({
              type: 'success',
              text: 'Team updated successfully',
              dismissible: true,
            });
            this.loading = false;
          },
          error: (err) => {
            this.loading = false;
            this.messageService.addMessage({
              type: 'error',
              text: `Failed to update team: ${err.message}`,
              dismissible: true,
            });
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
