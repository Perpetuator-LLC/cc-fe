// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
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
import { MemberResult } from '../teams-list/teams-list.component';
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
import { PodcastsService } from '../podcasts.service';
import { PodcastsResult } from '../podcasts-list/podcasts-list.component';

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
  private teamId: string;
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
    this.teamId = id;

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
      this.podcastsService.getPodcastsByTeamId(this.teamId).subscribe({
        next: (podcasts: PodcastsResult[]) => {
          this.podcasts = podcasts;
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
      this.teamsService.getTeamById(this.teamId).subscribe({
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

  // private setRssFeeds(rssFeeds: RssFeedResult[]): void {
  //   const rssFeedsFormArray = this.rssFeeds;
  //   rssFeedsFormArray.clear();
  //   rssFeeds.forEach((feed) => {
  //     rssFeedsFormArray.push(
  //       this.fb.group({
  //         id: [feed.id, Validators.required],
  //         url: [feed.url, Validators.required],
  //       }),
  //     );
  //   });
  // }

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

  // refreshTelegram() {
  //   const { id } = this.teamForm.getRawValue();
  //   this.teamsService.refreshTgResponse(id).subscribe({
  //     next: () => {
  //       this.messageService.success(`Team Telegram response refreshed successfully`);
  //     },
  //     error: (err) => {
  //       this.messageService.error(`Failed to refresh Telegram response: ${err.message}`);
  //     },
  //   });
  // }

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

  // copyPodcastUrl() {
  //   const url = this.teamForm.get('url')?.value;
  //   if (!url || url === '') {
  //     this.messageService.error('Podcast URL is empty');
  //     return;
  //   }
  //   if (this.clipboard.copy(url)) {
  //     this.messageService.success('Podcast URL copied to clipboard');
  //   } else {
  //     this.messageService.error('Failed to copy podcast URL');
  //   }
  // }

  deleteTeamDialog() {
    const teamName = this.teamForm.get('name')?.value;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          "<h3>Removing team '" +
          teamName +
          "' will remove all associated episodes and audio files owned by this team. This cannot be undone.</h3>" +
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

  // onPodcastImageSelected(event: Event) {
  //   const file = (event.target as HTMLInputElement).files?.[0];
  //   if (file) {
  //     this.selectedFile = file;
  //
  //     // Preview the image
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       this.previewImage = reader.result;
  //     };
  //     reader.readAsDataURL(this.selectedFile);
  //
  //     this.uploadPodcastImage(file);
  //   }
  // }

  // private uploadPodcastImage(file: File) {
  //   this.teamsService.uploadPodcastImage(this.teamId, file).subscribe({
  //     next: (response) => {
  //       this.messageService.success('Podcast image uploaded successfully');
  //       this.teamForm.patchValue({ imageUrl: response.team.imageUrl });
  //       this.selectedFile = null;
  //       this.teamForm.get('image')?.reset();
  //     },
  //     error: (error) => {
  //       this.messageService.error(`Failed to upload podcast image: ${error.message}`);
  //       this.selectedFile = null;
  //       this.teamForm.get('image')?.reset();
  //     },
  //   });
  // }

  // get rssFeeds(): FormArray {
  //   return this.teamForm.get('rssFeeds') as FormArray;
  // }
  //
  // openAddRssFeedDialog(): void {
  //   const dialogRef = this.dialog.open(AddRssFeedDialogComponent, {
  //     width: '400px',
  //   });
  //
  //   dialogRef.afterClosed().subscribe((result) => {
  //     if (result) {
  //       this.addRssFeed(result.url);
  //     }
  //   });
  // }
  //
  // addRssFeed(url: string): void {
  //   this.rssFeedLoading = true;
  //   this.subscriptions.add(
  //     this.teamsService.createRssFeed(url).subscribe({
  //       next: (data) => {
  //         const existingId = this.rssFeeds.controls.findIndex((a) => a.get('id')?.value == data.rssFeed.id);
  //         if (existingId >= 0) {
  //           this.messageService.info('RSS Feed already exists');
  //           this.rssFeedLoading = false;
  //           return;
  //         }
  //         this.rssFeeds.push(
  //           this.fb.group({
  //             id: [data.rssFeed.id, Validators.required],
  //             url: [data.rssFeed.url, Validators.required],
  //           }),
  //         );
  //         this.updateRssFeeds();
  //       },
  //       error: (err) => {
  //         this.messageService.error(`Failed to update RSS Feeds: ${err.message}`);
  //       },
  //     }),
  //   );
  // }
  // //
  // removeRssFeed(feedId: number): void {
  //   this.rssFeeds.removeAt(this.rssFeeds.controls.findIndex((control) => control.get('id')?.value === feedId));
  //   this.updateRssFeeds();
  // }
  //
  // private updateRssFeeds(): void {
  //   this.rssFeedLoading = true;
  //   const rssFeedIds = this.rssFeeds.value.map((feed: RssFeedResult) => feed.id);
  //   this.teamsService.setTeamRssFeeds(this.teamId, rssFeedIds).subscribe({
  //     next: (data) => {
  //       this.teamForm.patchValue(data.team);
  //       this.rssFeedLoading = false;
  //       this.messageService.success('RSS Feeds updated successfully');
  //     },
  //     error: (err) => {
  //       this.refreshTeamData();
  //       this.rssFeedLoading = false;
  //       this.messageService.error(`Failed to update RSS Feeds: ${err.message}`);
  //     },
  //   });
  // }
}
