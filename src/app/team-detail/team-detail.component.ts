// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { MemberResult, TeamsService } from '../teams.service';
import { ToolbarService } from '../toolbar.service';
import { MessageComponent } from '../message/message.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
import { MatPaginator } from '@angular/material/paginator';
import { UserAutocompleteComponent } from '../user-autocomplete/user-autocomplete.component';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { PodcastsResult, PodcastsService } from '../podcasts.service';
import { RelayConnection } from '../utils/relay';
import { MatTabsModule } from '@angular/material/tabs';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { DeleteTeamDialogComponent } from './delete-team-dialog.component';
import { AddMemberDialogComponent } from '../add-member-dialog/add-member-dialog.component';
import { CreatePodcastDialogComponent } from '../create-podcast-dialog/create-podcast-dialog.component';

@Component({
  selector: 'app-team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss'],
  standalone: true,
  imports: [
    MessageComponent,
    MatProgressBarModule,
    MatCard,
    ReactiveFormsModule,
    MatFormField,
    MatButton,
    MatTable,
    MatHeaderCell,
    MatCell,
    MatMenuTrigger,
    MatMenu,
    SvgIconComponent,
    MatColumnDef,
    MatHeaderCellDef,
    MatCellDef,
    UserAutocompleteComponent,
    MatSelect,
    MatOption,
    MatPaginator,
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
    MatTabsModule,
    DeleteTeamDialogComponent,
    AddMemberDialogComponent,
  ],
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  teamForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;
  protected supportedRoles: string[] = ['reader', 'editor', 'publisher', 'owner'];
  private teamUuid: string;
  protected deleteConfirmation = '';
  protected podcasts: PodcastsResult[] = [];
  protected podcastsDisplayedColumns: string[] = ['name', 'categories', 'enabled', 'actions'];
  protected loadingPodcasts = false;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];

  editingName = false;

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
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      throw new Error('Failed to get Team ID from route.');
    }
    this.teamUuid = uuid;

    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      uuid: [{ value: '', disabled: true }],
      name: [''],
      members: this.fb.array([]),
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
        next: (podcasts: RelayConnection<PodcastsResult>) => {
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
          this.messageService.error(`Failed to load team: ${err.message}`);
        },
      }),
    );
  }

  get members(): FormArray {
    return this.teamForm.get('members') as FormArray;
  }

  private setMembers(members: MemberResult[]): void {
    const memberFormArray = this.teamForm.get('members') as FormArray;
    memberFormArray.clear();
    members.forEach((member) => {
      memberFormArray.push(
        this.fb.group({
          user: this.fb.group({
            uuid: [member.user.uuid],
            username: [member.user.username],
          }),
          role: [member.role],
        }),
      );
    });
  }

  private openNewOwnerDialog(teamUuid: string, userUuid: string, role: string) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          '<h3>Assigning this user as an owner will give them management permissions (they can remove you).</h3>' +
          'Consider changing their role to another role first.<br/><br/><h2>Are you sure you want to proceed?</h2>',
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.upsertUserToTeam(teamUuid, userUuid, role);
      }
    });
  }

  private upsertUserToTeam(teamUuid: string, userUuid: string, role: string) {
    this.subscriptions.add(
      this.teamsService.upsertUserToTeam(teamUuid, userUuid, role).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
        },
        error: (err) => {
          this.messageService.error(`Failed to add user: ${err.message}`);
        },
      }),
    );
  }

  removeUserFromTeam(userUuid: string) {
    const teamUuid = this.teamForm.get('uuid')?.value;
    const user = this.members.controls.find((control) => control.get('user.uuid')?.value === userUuid);
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
          this.deleteUserFromTeam(teamUuid, userUuid);
        }
      });
    } else {
      this.deleteUserFromTeam(teamUuid, userUuid);
    }
  }

  private deleteUserFromTeam(teamUuid: string, userUuid: string) {
    this.subscriptions.add(
      this.teamsService.removeUserFromTeam(teamUuid, userUuid).subscribe({
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

  onEditOrSaveName() {
    if (!this.editingName) {
      // Enable editing
      this.editingName = true;
      setTimeout(() => {
        const input = document.querySelector('input[formcontrolname="name"]') as HTMLInputElement;
        if (input) input.focus();
      });
    } else {
      // Save and disable editing
      this.saveTeam();
      // saveTeam will set editingName = false after successful save
    }
  }

  saveTeam() {
    if (!this.teamForm.valid) {
      return;
    }
    const { uuid, name } = this.teamForm.getRawValue();
    const saveObservable = uuid ? this.teamsService.updateTeam(uuid, name) : this.teamsService.createTeam(name);

    this.subscriptions.add(
      saveObservable.subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            setTimeout(() => {
              this.editingName = false;
            }, 2000); // 2 seconds
            return;
          }
          this.messageService.success(`Team ${uuid ? 'updated' : 'created'} successfully`);
          this.teamForm.patchValue(data.team);
          this.teamForm.markAsPristine();
          if (!uuid) {
            this.router.navigate(['/teams']);
          }
          this.editingName = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to ${uuid ? 'update' : 'create'} team: ${err.message}`);
          setTimeout(() => {
            this.editingName = false;
          }, 2000); // 2 seconds
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  deleteTeamDialog(): void {
    const dialogRef = this.dialog.open(DeleteTeamDialogComponent, {
      width: '500px',
      data: { teamName: this.teamForm.get('name')?.value },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.teamsService.deleteTeam(this.teamUuid, this.deleteConfirmation).subscribe({
          next: () => {
            this.messageService.success('Team deleted successfully');
            this.router.navigate(['/teams']);
          },
          error: (error) => {
            this.messageService.error(`Failed to delete team: ${error.message}`);
          },
        });
      }
    });
  }

  openAddMemberDialog(): void {
    const dialogRef = this.dialog.open(AddMemberDialogComponent, {
      width: '500px',
      data: {
        teamUuid: this.teamUuid,
        supportedRoles: this.supportedRoles,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const { userUuid, role } = result;
        this.addOrUpdateUserInTeamFromDialog(userUuid, role);
      }
    });
  }

  private addOrUpdateUserInTeamFromDialog(userUuid: string, role: string): void {
    if (userUuid && role) {
      const teamUuid = this.teamForm.get('uuid')?.value;

      // Check if this is a new owner assignment
      if (role === 'owner') {
        this.openNewOwnerDialog(teamUuid, userUuid, role);
      } else {
        // Check if user was previously an owner
        const user = this.members.controls.find((control) => control.get('user.uuid')?.value === userUuid);
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
              this.upsertUserToTeam(teamUuid, userUuid, role);
            }
          });
        } else {
          this.upsertUserToTeam(teamUuid, userUuid, role);
        }
      }
    }
  }
  createPodcast(): void {
    const dialogRef = this.dialog.open(CreatePodcastDialogComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Refresh the podcasts list
        this.loadTeamPodcasts();
      }
    });
  }
  archivePodcast(uuid: string) {
    console.log('Archive podcast:', uuid);
    // Implement archive podcast logic here
  }
}
