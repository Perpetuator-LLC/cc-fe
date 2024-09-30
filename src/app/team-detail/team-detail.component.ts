import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
import { ToolbarService } from '../toolbar.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { UserAutocompleteComponent } from '../user-autocomplete/user-autocomplete.component';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatIcon,
    MatLabel,
    MessageComponent,
    MatSelect,
    MatOption,
    UserAutocompleteComponent,
    MatIconButton,
    MatDivider,
  ],
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss'],
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(UserAutocompleteComponent) userAutocomplete!: UserAutocompleteComponent;
  teamForm!: FormGroup;
  newUserForm!: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;
  supportedRoles: string[] = ['reader', 'editor', 'publisher', 'owner'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
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

    this.newUserForm = this.fb.group({
      userId: ['', Validators.required],
      role: ['', Validators.required],
    });

    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) {
      throw new Error('Failed to get Team ID for updating Team');
    }
    this.loading = true;
    this.subscriptions.add(
      this.teamsService.getTeamById(teamId).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
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
    const formArray = this.teamForm.get('members') as FormArray;
    formArray.disable(); // Disable the form array to prevent changes, delete or update from the form
    return formArray;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setMembers(members: any[]): void {
    const membersFormArray = this.members;
    membersFormArray.clear();
    members.forEach((member) => {
      membersFormArray.push(
        this.fb.group({
          role: [member.role, Validators.required],
          user: this.fb.group({
            id: [member.user.id],
            username: [member.user.username],
          }),
        }),
      );
    });
  }

  addUserToTeam() {
    if (this.newUserForm.valid) {
      const { userId, role } = this.newUserForm.value;
      const teamId = this.teamForm.get('id')?.value;
      this.subscriptions.add(
        this.teamsService.upsertUserToTeam(teamId, userId, role).subscribe({
          next: (team) => {
            this.teamForm.patchValue(team);
            this.setMembers(team.members);
            this.newUserForm.reset();
            this.userAutocomplete.clearInput();
          },
          error: (err) => {
            this.messageService.addMessage({
              type: 'error',
              text: `Failed to add user to team: ${err.message}`,
              dismissible: true,
            });
          },
        }),
      );
    }
  }

  removeUserFromTeam(userId: string) {
    const teamId = this.teamForm.get('id')?.value;
    this.subscriptions.add(
      this.teamsService.removeUserFromTeam(teamId, userId).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
        },
        error: (err) => {
          this.messageService.addMessage({
            type: 'error',
            text: err.message,
            dismissible: true,
          });
        },
      }),
    );
  }

  onUserSelected(user: { id: string; username: string }) {
    this.newUserForm.patchValue({ userId: user.id });
  }

  saveTeam() {
    if (this.teamForm.valid) {
      const { id, name } = this.teamForm.getRawValue();
      const saveObservable = id ? this.teamsService.updateTeam(id, name) : this.teamsService.createTeam(name);

      this.subscriptions.add(
        saveObservable.subscribe({
          next: () => {
            this.messageService.addMessage({
              type: 'success',
              text: `Team ${id ? 'updated' : 'created'} successfully`,
              dismissible: true,
            });
            if (!id) {
              this.router.navigate(['/teams']);
            }
          },
          error: (err) => {
            this.messageService.addMessage({
              type: 'error',
              text: `Failed to ${id ? 'update' : 'create'} team: ${err.message}`,
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
