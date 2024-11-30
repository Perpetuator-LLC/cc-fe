import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { TeamsService, User } from '../teams.service';
import { ToolbarService } from '../toolbar.service';
import { MessageComponent } from '../message/message.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { UserAutocompleteComponent } from '../user-autocomplete/user-autocomplete.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';
import { MatInput, MatLabel } from '@angular/material/input';
import { MemberResult, TeamsResult } from '../teams-list/teams-list.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss'],
  standalone: true,
  imports: [
    MessageComponent,
    MatProgressSpinner,
    MatCard,
    ReactiveFormsModule,
    MatFormField,
    MatButton,
    MatTable,
    MatHeaderCell,
    MatCell,
    MatColumnDef,
    MatHeaderCellDef,
    MatCellDef,
    UserAutocompleteComponent,
    MatSelect,
    MatOption,
    MatHeaderRow,
    MatRow,
    MatRowDef,
    MatIcon,
    TitleCasePipe,
    MatLabel,
    MatInput,
    MatIconButton,
    MatHeaderRowDef,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFabButton,
    MatCheckbox,
    MatDivider,
  ],
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('autocomplete') autoComplete!: UserAutocompleteComponent;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  allUsers: User[] = [];
  teamForm!: FormGroup;
  newUserForm!: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;
  supportedRoles: string[] = ['reader', 'editor', 'publisher', 'owner'];
  protected initialFormValues: TeamsResult = {
    id: 0,
    name: '',
    podcastUrl: '',
    podcastEnabled: false,
    podcastSlug: '',
    intro: '',
    prompt: '',
    outro: '',
    members: [],
  };
  protected showPodcastFields = false;
  protected isFormChanged = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
  ) {}

  displayedColumns: string[] = ['username', 'role', 'actions'];

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: [''],
      podcastEnabled: [false],
      podcastSlug: [''],
      podcastUrl: [''],
      intro: [''],
      prompt: [''],
      outro: [''],
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
      this.teamsService.getAllUsers().subscribe((users) => {
        this.allUsers = users;
      }),
    );
    this.subscriptions.add(
      this.teamsService.getTeamById(teamId).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
          this.initialFormValues = this.teamForm.getRawValue();
          this.showPodcastFields = team.podcastEnabled;
          this.loading = false;
          this.checkIfFormChanged();
        },
        error: (err) => {
          this.loading = false;
          this.messageService.error(`Failed to retrieve team data: ${err.message}`);
        },
        complete: () => {
          this.loading = false;
          console.log('Retrieve team complete');
        },
      }),
    );
    this.subscriptions.add(
      this.teamForm.valueChanges.subscribe(() => {
        this.checkIfFormChanged();
      }),
    );
  }

  checkIfFormChanged() {
    const currentFormValues = this.teamForm.getRawValue() as TeamsResult;
    const changedFields = Object.keys(currentFormValues).filter((key) => {
      const typedKey = key as keyof TeamsResult;
      if (typedKey === 'members') {
        return false;
      }
      // console.log('Checking if field has changed:', typedKey);
      // console.log('Current value:', currentFormValues[typedKey]);
      // console.log('Initial value:', this.initialFormValues[typedKey]);
      // console.log('Is equal:', currentFormValues[typedKey] === this.initialFormValues[typedKey]);
      return currentFormValues[typedKey] !== this.initialFormValues[typedKey];
    });

    if (changedFields.length > 0) {
      // console.log('The following fields have changed:');
      changedFields.forEach((field) => {
        const typedField = field as keyof TeamsResult;
        console.log(`${field}: ${currentFormValues[typedField]}`);
      });
      this.isFormChanged = true;
    } else {
      // console.log('No fields have changed.');
      this.isFormChanged = false;
    }
  }

  get members(): FormArray {
    return this.teamForm.get('members') as FormArray;
  }

  private setMembers(members: MemberResult[]): void {
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

  addOrUpdateUserInTeam() {
    this.messageService.clearMessages();
    if (this.newUserForm.valid) {
      const { userId, role } = this.newUserForm.value;
      const teamId: string = this.teamForm.get('id')?.value;
      if (role === 'owner') {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
          data: {
            message:
              '<h3>Assigning this user as an owner will give them management permissions (they can remove you).</h3>' +
              'Consider changing their role to another role first.<br/><br/><h2>Are you sure you want to proceed?</h2>',
          },
        });
        dialogRef.afterClosed().subscribe((confirmed) => {
          if (confirmed) {
            this.upsertUserToTeam(teamId, userId, role);
          }
        });
      } else {
        this.upsertUserToTeam(teamId, userId, role);
      }
    } else {
      this.messageService.error('Please select a user and role');
    }
  }

  private upsertUserToTeam(teamId: string, userId: string, role: string) {
    this.subscriptions.add(
      this.teamsService.upsertUserToTeam(teamId, userId, role).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
          this.newUserForm.reset();
          this.autoComplete.clearInput();
        },
        error: (err) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to update user: ${err.message}`,
            dismissible: true,
          });
        },
      }),
    );
  }

  removeUserFromTeam(userId: string) {
    this.messageService.clearMessages();
    const teamId = this.teamForm.get('id')?.value;
    const user = this.members.controls.find((control) => control.get('user.id')?.value === userId);
    const role = user?.get('role')?.value;

    if (role === 'owner') {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          message:
            '<h3>Removing this owner will remove their management permissions and access to this team.</h3>' +
            'Consider changing their role to another role first.<br/><br/><h2>Are you sure you want to proceed?</h2>',
        },
      });
      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.deleteUserFromTeam(teamId, userId);
        }
      });
    } else {
      this.deleteUserFromTeam(teamId, userId);
    }
  }

  private deleteUserFromTeam(teamId: string, userId: string) {
    this.subscriptions.add(
      this.teamsService.removeUserFromTeam(teamId, userId).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
        },
        error: (err) => {
          this.messageService.error(`Failed to remove user: ${err.message}`);
        },
      }),
    );
  }

  onUserSelected(user: { id: string; username: string }) {
    this.newUserForm.patchValue({ userId: user.id });
  }

  saveTeam() {
    if (this.teamForm.valid) {
      const { id, name, podcastEnabled, podcastSlug, intro, prompt, outro } = this.teamForm.getRawValue();
      const saveObservable = id
        ? this.teamsService.updateTeam(id, name, podcastEnabled, podcastSlug, intro, prompt, outro)
        : this.teamsService.createTeam(name);

      this.subscriptions.add(
        saveObservable.subscribe({
          next: () => {
            this.messageService.success(`Team ${id ? 'updated' : 'created'} successfully`);
            if (!id) {
              this.router.navigate(['/teams']);
            } else {
              this.initialFormValues = this.teamForm.getRawValue();
              this.checkIfFormChanged();
            }
          },
          error: (err) => {
            this.messageService.error(`Failed to ${id ? 'update' : 'create'} team: ${err.message}`);
          },
        }),
      );
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  copyPodcastUrl() {
    const podcastUrl = this.teamForm.get('podcastUrl')?.value;
    if (!podcastUrl || podcastUrl === '') {
      this.messageService.error('Podcast URL is empty');
      return;
    }
    if (this.clipboard.copy(podcastUrl)) {
      this.messageService.success('Podcast URL copied to clipboard!');
    } else {
      this.messageService.error('Failed to copy podcast URL');
    }
  }
}
