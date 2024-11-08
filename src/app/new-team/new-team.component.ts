import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
import { ToolbarService } from '../toolbar.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MatCard } from '@angular/material/card';

@Component({
  selector: 'app-new-team',
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
  ],
  templateUrl: './new-team.component.html',
  styleUrls: ['./new-team.component.scss'],
})
export class NewTeamComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  teamForm!: FormGroup;
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: ['', Validators.required],
      members: this.fb.array([]),
    });
  }

  // get members(): FormArray {
  //   return this.teamForm.get('members') as FormArray;
  // }

  createTeam() {
    if (this.teamForm.valid) {
      const { name } = this.teamForm.getRawValue();
      console.log('Creating team:', { name }); // Add this line
      this.subscriptions.add(
        this.teamsService.createTeam(name).subscribe({
          next: (created) => {
            this.messageService.addMessage({
              type: 'success',
              text: 'Team created successfully',
              dismissible: true,
            });
            this.router.navigate(['/team', created.team.id]);
          },
          error: (err) => {
            this.messageService.addMessage({
              type: 'error',
              text: `Failed to create team: ${err.message}`,
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
