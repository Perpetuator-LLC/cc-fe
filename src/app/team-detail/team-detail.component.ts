import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
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
import { MemberResult } from '../teams-list/teams-list.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { User } from '../types';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
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
    MatTooltip,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    FormsModule,
    MatDivider,
  ],
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  @ViewChild('autocomplete') autoComplete!: UserAutocompleteComponent;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  allUsers: User[] = [];
  teamForm: FormGroup;
  newUserForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;
  supportedRoles: string[] = ['reader', 'editor', 'publisher', 'owner'];
  private teamId: string;
  protected podcastUrlDisabled = true;
  protected deleteConfirmation = '';
  selectedFile: File | null = null;
  previewImage: string | ArrayBuffer | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private teamsService: TeamsService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      throw new Error('Failed to get Team ID from route.');
    }
    this.teamId = id;

    this.teamForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: [''],
      intro: [''],
      prompt: [''],
      outro: [''],
      podcastEnabled: [false],
      podcastSlug: [{ value: '', disabled: true }],
      podcastUrl: [{ value: '', disabled: true }],
      podcastDescription: [''],
      podcastImage: [null],
      podcastImageUrl: [null],
      members: this.fb.array([]),
      tgBotToken: [null],
      tgChannelId: [null],
      tgResponse: [null],
    });

    this.teamForm.get('podcastEnabled')?.valueChanges.subscribe((enabled) => {
      const team = this.teamForm.getRawValue();
      const podcastSlugControl = this.teamForm.get('podcastSlug');
      if (enabled != podcastSlugControl?.disabled) {
        // console.debug('Podcast slug control already enabled');
        return;
      }
      team.podcastEnabled = enabled;
      this.podcastUrlDisabled = !enabled;
      if (enabled) {
        // if the podcast slug is empty snake case the team name
        const teamName = team.name;
        if (!team.podcastSlug && teamName) {
          team.podcastSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
        podcastSlugControl?.enable();
      } else {
        podcastSlugControl?.disable();
      }
      this.teamForm.patchValue(team);
    });

    this.newUserForm = this.fb.group({
      userId: ['', Validators.required],
      role: ['', Validators.required],
    });
  }

  displayedColumns: string[] = ['username', 'role', 'actions'];

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.loading = true;
    this.subscriptions.add(
      this.teamsService.getAllUsers().subscribe((users) => {
        this.allUsers = users;
      }),
    );
    this.subscriptions.add(
      this.teamsService.getTeamById(this.teamId).subscribe({
        next: (team) => {
          this.teamForm.patchValue(team);
          this.setMembers(team.members);
          this.loading = false;
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
      const teamId: string = this.teamForm.get('id')?.value;
      if (role === 'owner') {
        this.openNewOwnerDialog(teamId, userId, role);
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
              this.upsertUserToTeam(teamId, userId, role);
            }
          });
        } else {
          this.upsertUserToTeam(teamId, userId, role);
        }
      }
    } else {
      this.messageService.error('Please select a user and role');
    }
  }

  private openNewOwnerDialog(teamId: string, userId: string, role: string) {
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
          this.messageService.error(`Failed to add user: ${err.message}`);
        },
      }),
    );
  }

  removeUserFromTeam(userId: string) {
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

  refreshTelegram() {
    const { id } = this.teamForm.getRawValue();
    this.teamsService.refreshTgResponse(id).subscribe({
      next: () => {
        this.messageService.success(`Team Telegram response refreshed successfully`);
      },
      error: (err) => {
        this.messageService.error(`Failed to refresh Telegram response: ${err.message}`);
      },
    });
  }

  saveTeam() {
    if (!this.teamForm.valid) {
      return;
    }
    const { id, name, intro, prompt, outro, podcastEnabled, podcastSlug, podcastDescription, tgBotToken, tgChannelId } =
      this.teamForm.getRawValue();
    if (podcastEnabled && !podcastSlug) {
      this.messageService.error('Podcast slug is required when podcast is enabled');
      return;
    }
    const saveObservable = id
      ? this.teamsService.updateTeam(
          id,
          name,
          intro,
          prompt,
          outro,
          podcastEnabled,
          podcastSlug,
          podcastDescription,
          tgBotToken,
          tgChannelId,
        )
      : this.teamsService.createTeam(name);

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

  copyPodcastUrl() {
    const podcastUrl = this.teamForm.get('podcastUrl')?.value;
    if (!podcastUrl || podcastUrl === '') {
      this.messageService.error('Podcast URL is empty');
      return;
    }
    if (this.clipboard.copy(podcastUrl)) {
      this.messageService.success('Podcast URL copied to clipboard');
    } else {
      this.messageService.error('Failed to copy podcast URL');
    }
  }

  deleteTeamDialog() {
    const teamName = this.teamForm.get('name')?.value;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          "<h3>Removing team '" +
          teamName +
          "' will remove all associated articles and audio files owned by this team. This cannot be undone.</h3>" +
          '<br/><br/><h2>Are you sure you want to proceed?</h2>',
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        // get confirmation from user
        this.deleteTeam();
      }
    });
  }

  private deleteTeam() {
    this.subscriptions.add(
      this.teamsService.deleteTeam(this.teamId, this.deleteConfirmation).subscribe({
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

  onPodcastImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;

      // Preview the image
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);

      this.uploadPodcastImage(file);
    }
  }

  private uploadPodcastImage(file: File) {
    this.teamsService.uploadPodcastImage(this.teamId, file).subscribe({
      next: (response) => {
        this.messageService.success('Podcast image uploaded successfully');
        this.teamForm.patchValue({ podcastImageUrl: response.team.podcastImageUrl });
        this.selectedFile = null;
        this.teamForm.get('podcastImage')?.reset();
      },
      error: (error) => {
        this.messageService.error(`Failed to upload podcast image: ${error.message}`);
        this.selectedFile = null;
        this.teamForm.get('podcastImage')?.reset();
      },
    });
  }
}
