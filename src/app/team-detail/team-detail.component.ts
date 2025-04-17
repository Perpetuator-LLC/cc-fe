// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { MemberResult, TeamsService } from '../teams.service';
import { ToolbarService } from '../toolbar.service';
import { MessageComponent } from '../message/message.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField } from '@angular/material/form-field';
import { MatButton, MatIconButton } from '@angular/material/button';
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
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { User } from '../types';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { PodcastConnection, PodcastsResult, PodcastsService } from '../podcasts.service';

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
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    FormsModule,
    RouterLink,
  ],
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('autocomplete') autoComplete!: UserAutocompleteComponent;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  users: User[] = [];
  teamForm: FormGroup;
  newUserForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;
  protected supportedRoles: string[] = ['reader', 'editor', 'publisher', 'owner'];
  private teamUuid: string;
  protected deleteConfirmation = '';
  protected podcasts: PodcastsResult[] = [];
  protected podcastsDisplayedColumns: string[] = ['name', 'enabled', 'actions'];
  protected loadingPodcasts = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private podcastsService: PodcastsService,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      throw new Error('Failed to get Team ID from route.');
    }
    this.teamUuid = id;

    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: [''],
      members: this.fb.array([]),
    });

    this.newUserForm = this.fb.group({
      userId: ['', Validators.required],
      role: ['', Validators.required],
    });
  }

  displayedColumns: string[] = ['username', 'role', 'actions'];
  // imageUrl: string | null = null;

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.loading = true;
    this.refreshTeamData();
  }

  private loadTeamPodcasts(): void {
    this.loadingPodcasts = true;
    this.subscriptions.add(
      this.podcastsService.getPodcastsByTeamId(this.teamUuid).subscribe({
        next: (podcasts: PodcastConnection) => {
          this.podcasts = podcasts.edges.map((edge) => edge.node);
          this.loadingPodcasts = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load team podcasts: ${err.message}`);
          this.loadingPodcasts = false;
        },
      }),
    );
  }

  protected searchUsers(query: string) {
    if (query && query.length >= 3) {
      // this.loading = true;
      this.subscriptions.add(
        this.teamsService.users(query).subscribe({
          next: (users) => {
            this.users = users;
            // this.loading = false;
          },
          error: (err) => {
            this.messageService.error(`Failed to retrieve users: ${err.message}`);
            // this.loading = false;
            this.users = [];
          },
        }),
      );
    } else {
      // Clear results when query is too short
      this.users = [];
    }
  }

  private refreshTeamData() {
    this.subscriptions.add(
      this.teamsService.getTeamById(this.teamUuid).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
          this.loading = false;
          this.loadTeamPodcasts();
        },
        error: (err) => {
          this.loading = false;
          this.messageService.error(`Failed to retrieve team data: ${err.message}`);
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
    if (this.newUserForm.valid) {
      const { userId, role } = this.newUserForm.value;
      const teamUuid: string = this.teamForm.get('id')?.value;
      if (role === 'owner') {
        this.openNewOwnerDialog(teamUuid, userId, role);
      } else {
        // if the user was an owner, we need to show a confirmation dialog
        const user = this.members.controls.find((control) => control.get('user.id')?.value === userId);
        const previousRole = user?.get('role')?.value;
        if (previousRole === 'owner') {
          const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
              message:
                `<h3>This will remove the management permission from user: ${user?.get('user.username')?.value}</h3>` +
                'They will no longer be able to manage this team.<br/><br/><h2>Are you sure you want to proceed?</h2>',
            },
          });
          dialogRef.afterClosed().subscribe((confirmed) => {
            if (confirmed) {
              this.upsertUserToTeam(teamUuid, userId, role);
            }
          });
        } else {
          this.upsertUserToTeam(teamUuid, userId, role);
        }
      }
    } else {
      this.messageService.error('Please select a user and role');
    }
  }

  private openNewOwnerDialog(teamUuid: string, userId: string, role: string) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          '<h3>Assigning this user as an owner will give them management permissions (they can remove you).</h3>' +
          'Consider changing their role to another role first.<br/><br/><h2>Are you sure you want to proceed?</h2>',
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.upsertUserToTeam(teamUuid, userId, role);
      }
    });
  }

  private upsertUserToTeam(teamUuid: string, userId: string, role: string) {
    this.subscriptions.add(
      this.teamsService.upsertUserToTeam(teamUuid, userId, role).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
          this.newUserForm.reset();
          this.autoComplete.clearInput();
        },
        error: (err) => {
          this.messageService.error(`Failed to add user: ${err.message}`);
        },
      }),
    );
  }

  removeUserFromTeam(userId: string) {
    const teamUuid = this.teamForm.get('id')?.value;
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
          this.deleteUserFromTeam(teamUuid, userId);
        }
      });
    } else {
      this.deleteUserFromTeam(teamUuid, userId);
    }
  }

  private deleteUserFromTeam(teamUuid: string, userId: string) {
    this.subscriptions.add(
      this.teamsService.removeUserFromTeam(teamUuid, userId).subscribe({
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
    if (!this.teamForm.valid) {
      return;
    }
    const { id, name } = this.teamForm.getRawValue();
    const saveObservable = id ? this.teamsService.updateTeam(id, name) : this.teamsService.createTeam(name);

    this.subscriptions.add(
      saveObservable.subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          this.messageService.success(`Team ${id ? 'updated' : 'created'} successfully`);
          this.teamForm.patchValue(data.team);
          this.teamForm.markAsPristine();
          if (!id) {
            this.router.navigate(['/teams']);
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to ${id ? 'update' : 'create'} team: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  deleteTeamDialog() {
    const teamName = this.teamForm.get('name')?.value;

    // Build podcast list to show in the confirmation dialog
    let podcastsList = '';
    if (this.podcasts.length > 0) {
      podcastsList =
        '<ul>' +
        this.podcasts.map((podcast) => `<li>${podcast.name}</li>`).join('') +
        '</ul>' +
        '<h3 class="danger">WARNING: The deleted podcast\'s episodes and audio files will also be ' +
        'permanently deleted.</h3>';
    } else {
      podcastsList = '<p>No podcasts associated with this team.</p>';
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          `<h3>Removing team '${teamName}' will result in the following podcasts also being removed:</h3>` +
          podcastsList +
          '<h2>This action cannot be undone. Are you sure you want to proceed?</h2>',
      },
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteTeam();
      }
    });
  }

  private deleteTeam() {
    this.subscriptions.add(
      this.teamsService.deleteTeam(this.teamUuid, this.deleteConfirmation).subscribe({
        next: () => {
          this.messageService.success('Team deleted successfully');
          this.router.navigate(['/teams']);
        },
        error: (err) => {
          this.messageService.error(`Failed to delete team: ${err.message}`);
        },
      }),
    );
  }
}
