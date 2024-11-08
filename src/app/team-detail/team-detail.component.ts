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
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
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
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';
import { MatInput, MatLabel } from '@angular/material/input';
import { MemberResult } from '../teams-list/teams-list.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

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
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatTable,
    MatHeaderCell,
    MatCell,
    MatColumnDef,
    MatHeaderCellDef,
    MatCellDef,
    UserAutocompleteComponent,
    MatSelect,
    MatOption,
    MatDivider,
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
  ) {}

  displayedColumns: string[] = ['username', 'role', 'actions'];

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
      this.teamsService.getAllUsers().subscribe((users) => {
        this.allUsers = users;
      }),
    );
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
      this.messageService.addMessage({
        type: 'error',
        text: 'Please select a user and role',
        dismissible: true,
      });
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
    this.messageService.clearMessages();
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
