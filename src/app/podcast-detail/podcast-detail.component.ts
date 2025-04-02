// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from '../message.service';
import { PodcastsService } from '../podcasts.service';
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
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatLabel } from '@angular/material/input';
import { RssFeedResult } from '../podcasts-list/podcasts-list.component';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatDivider } from '@angular/material/divider';
import { AddRssFeedDialogComponent } from '../add-rss-feed-dialog/add-rss-feed-dialog.component';

@Component({
  selector: 'app-podcast-detail',
  templateUrl: './podcast-detail.component.html',
  styleUrls: ['./podcast-detail.component.scss'],
  standalone: true,
  imports: [
    MessageComponent,
    MatProgressSpinner,
    ReactiveFormsModule,
    MatFormField,
    MatButton,
    MatTable,
    MatHeaderCell,
    MatCell,
    MatColumnDef,
    MatHeaderCellDef,
    MatCellDef,
    MatHeaderRow,
    MatRow,
    MatRowDef,
    MatIcon,
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
    MatCard,
  ],
})
export class PodcastDetailComponent implements OnInit, OnDestroy {
  @ViewChild('autocomplete') autoComplete!: UserAutocompleteComponent;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  // allUsers: User[] = [];
  podcastForm: FormGroup;
  // newUserForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = false;
  protected rssFeedLoading = false;
  // protected supportedRoles: string[] = ['reader', 'editor', 'publisher', 'owner'];
  protected rssFeedsDisplayedColumns: string[] = ['url', 'actions'];
  private podcastId: string;
  protected urlDisabled = true;
  protected deleteConfirmation = '';
  selectedFile: File | null = null;
  previewImage: string | ArrayBuffer | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private podcastsService: PodcastsService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private clipboard: Clipboard,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      throw new Error('Failed to get Podcast ID from route.');
    }
    this.podcastId = id;

    this.podcastForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      name: [''],
      intro: [''],
      prompt: [''],
      outro: [''],
      enabled: [false],
      slug: [{ value: '', disabled: true }],
      url: [{ value: '', disabled: true }],
      description: [''],
      ownerName: [''],
      ownerEmail: [''],
      ownerLink: [''],
      image: [null],
      imageUrl: [null],
      rssFeeds: this.fb.array([]),
      // members: this.fb.array([]),
      tgBotToken: [null],
      tgChannelId: [null],
      tgResponse: [null],
    });

    this.podcastForm.get('enabled')?.valueChanges.subscribe((enabled) => {
      const podcast = this.podcastForm.getRawValue();
      const slugControl = this.podcastForm.get('slug');
      if (enabled != slugControl?.disabled) {
        // console.debug('Podcast slug control already enabled');
        return;
      }
      podcast.enabled = enabled;
      this.urlDisabled = !enabled;
      if (enabled) {
        // if the podcast slug is empty snake case the podcast name
        const podcastName = podcast.name;
        if (!podcast.slug && podcastName) {
          podcast.slug = podcastName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
        slugControl?.enable();
      } else {
        slugControl?.disable();
      }
      this.podcastForm.patchValue(podcast);
    });

    // this.newUserForm = this.fb.group({
    //   userId: ['', Validators.required],
    //   role: ['', Validators.required],
    // });
  }

  // displayedColumns: string[] = ['username', 'role', 'actions'];
  imageUrl: string | null = null;

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.loading = true;
    // this.subscriptions.add(
    //   // TODO: input from form drop-down text box
    //   this.podcastsService.users('soo').subscribe({
    //     next: (users) => {
    //       if (!users || users.length === 0) {
    //         this.messageService.error('Failed to retrieve users, no users found');
    //         return;
    //       }
    //       this.allUsers = users;
    //     },
    //     error: (err) => {
    //       this.messageService.error(`Failed to retrieve users: ${err.message}`);
    //     },
    //   }),
    // );
    this.refreshPodcastData();
    this.imageUrl = this.podcastForm.get('imageUrl')?.value;
    this.subscriptions.add(
      this.podcastForm.get('imageUrl')?.valueChanges.subscribe((value) => {
        this.imageUrl = value;
      }),
    );
  }

  private refreshPodcastData() {
    this.subscriptions.add(
      this.podcastsService.getPodcastById(this.podcastId).subscribe({
        next: (podcast) => {
          this.podcastForm.patchValue(podcast);
          // this.setMembers(podcast.members);
          this.setRssFeeds(podcast.rssFeeds);
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.messageService.error(`Failed to retrieve podcast data: ${err.message}`);
        },
      }),
    );
  }

  get members(): FormArray {
    return this.podcastForm.get('members') as FormArray;
  }

  // private setMembers(members: MemberResult[]): void {
  //   const membersFormArray = this.members;
  //   membersFormArray.clear();
  //   members.forEach((member) => {
  //     membersFormArray.push(
  //       this.fb.group({
  //         role: [member.role, Validators.required],
  //         user: this.fb.group({
  //           id: [member.user.id],
  //           username: [member.user.username],
  //         }),
  //       }),
  //     );
  //   });
  // }

  private setRssFeeds(rssFeeds: RssFeedResult[]): void {
    const rssFeedsFormArray = this.rssFeeds;
    rssFeedsFormArray.clear();
    rssFeeds.forEach((feed) => {
      rssFeedsFormArray.push(
        this.fb.group({
          id: [feed.id, Validators.required],
          url: [feed.url, Validators.required],
        }),
      );
    });
  }

  // addOrUpdateUserInPodcast() {
  //   if (this.newUserForm.valid) {
  //     const { userId, role } = this.newUserForm.value;
  //     const podcastId: string = this.podcastForm.get('id')?.value;
  //     if (role === 'owner') {
  //       this.openNewOwnerDialog(podcastId, userId, role);
  //     } else {
  //       // if the user was an owner, we need to show a confirmation dialog
  //       const user = this.members.controls.find((control) => control.get('user.id')?.value === userId);
  //       const previousRole = user?.get('role')?.value;
  //       if (previousRole === 'owner') {
  //         const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
  //           data: {
  //             message:
  //               `<h3>This will remove the management permission from user: ${user?.get('user.username')?.value}</h3>
  //               ` +
  //               'They will no longer be able to manage this podcast.<br/><br/><h2>Are you sure you want to proceed?
  //               </h2>',
  //           },
  //         });
  //         dialogRef.afterClosed().subscribe((confirmed) => {
  //           if (confirmed) {
  //             this.upsertUserToPodcast(podcastId, userId, role);
  //           }
  //         });
  //       } else {
  //         this.upsertUserToPodcast(podcastId, userId, role);
  //       }
  //     }
  //   } else {
  //     this.messageService.error('Please select a user and role');
  //   }
  // }

  // private openNewOwnerDialog(podcastId: string, userId: string, role: string) {
  //   const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
  //     data: {
  //       message:
  //         '<h3>Assigning this user as an owner will give them management permissions (they can remove you).</h3>' +
  //         'Consider changing their role to another role first.<br/><br/><h2>Are you sure you want to proceed?</h2>',
  //     },
  //   });
  //   dialogRef.afterClosed().subscribe((confirmed) => {
  //     if (confirmed) {
  //       this.upsertUserToPodcast(podcastId, userId, role);
  //     }
  //   });
  // }

  // private upsertUserToPodcast(podcastId: string, userId: string, role: string) {
  //   this.subscriptions.add(
  //     this.podcastsService.upsertUserToPodcast(podcastId, userId, role).subscribe({
  //       next: (podcast) => {
  //         this.podcastForm.patchValue(podcast);
  //         this.setMembers(podcast.members);
  //         this.newUserForm.reset();
  //         this.autoComplete.clearInput();
  //       },
  //       error: (err) => {
  //         this.messageService.error(`Failed to add user: ${err.message}`);
  //       },
  //     }),
  //   );
  // }

  // removeUserFromPodcast(userId: string) {
  //   const podcastId = this.podcastForm.get('id')?.value;
  //   const user = this.members.controls.find((control) => control.get('user.id')?.value === userId);
  //   const role = user?.get('role')?.value;
  //
  //   if (role === 'owner') {
  //     const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
  //       data: {
  //         message:
  //           '<h3>Removing this owner will remove their management permissions and access to this podcast.</h3>' +
  //           'Consider changing their role to another role first.<br/><br/><h2>Are you sure you want to proceed?</h2>
  //           ',
  //       },
  //     });
  //     dialogRef.afterClosed().subscribe((confirmed) => {
  //       if (confirmed) {
  //         this.deleteUserFromPodcast(podcastId, userId);
  //       }
  //     });
  //   } else {
  //     this.deleteUserFromPodcast(podcastId, userId);
  //   }
  // }

  // private deleteUserFromPodcast(podcastId: string, userId: string) {
  //   this.subscriptions.add(
  //     this.podcastsService.removeUserFromPodcast(podcastId, userId).subscribe({
  //       next: (podcast) => {
  //         this.podcastForm.patchValue(podcast);
  //         this.setMembers(podcast.members);
  //       },
  //       error: (err) => {
  //         this.messageService.error(`Failed to remove user: ${err.message}`);
  //       },
  //     }),
  //   );
  // }

  // onUserSelected(user: { id: string; username: string }) {
  //   this.newUserForm.patchValue({ userId: user.id });
  // }

  refreshTelegram() {
    const { id } = this.podcastForm.getRawValue();
    this.podcastsService.refreshTgResponse(id).subscribe({
      next: () => {
        this.messageService.success(`Podcast Telegram response refreshed successfully`);
      },
      error: (err) => {
        this.messageService.error(`Failed to refresh Telegram response: ${err.message}`);
      },
    });
  }

  savePodcast() {
    if (!this.podcastForm.valid) {
      return;
    }
    const {
      id,
      name,
      intro,
      prompt,
      outro,
      enabled,
      slug,
      description,
      ownerName,
      ownerEmail,
      ownerLink,
      tgBotToken,
      tgChannelId,
    } = this.podcastForm.getRawValue();
    if (enabled && !slug) {
      this.messageService.error('Podcast slug is required when podcast is enabled');
      return;
    }
    const saveObservable = id
      ? this.podcastsService.updatePodcast(
          id,
          name,
          intro,
          prompt,
          outro,
          enabled,
          slug,
          description,
          ownerName,
          ownerEmail,
          ownerLink,
          tgBotToken,
          tgChannelId,
        )
      : this.podcastsService.createPodcast(name);

    this.subscriptions.add(
      saveObservable.subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          this.messageService.success(`Podcast ${id ? 'updated' : 'created'} successfully`);
          this.podcastForm.patchValue(data.podcast);
          this.podcastForm.markAsPristine();
          if (!id) {
            this.router.navigate(['/podcasts']);
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to ${id ? 'update' : 'create'} podcast: ${err.message}`);
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  copyPodcastUrl() {
    const url = this.podcastForm.get('url')?.value;
    if (!url || url === '') {
      this.messageService.error('Podcast URL is empty');
      return;
    }
    if (this.clipboard.copy(url)) {
      this.messageService.success('Podcast URL copied to clipboard');
    } else {
      this.messageService.error('Failed to copy podcast URL');
    }
  }

  deletePodcastDialog() {
    const podcastName = this.podcastForm.get('name')?.value;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          "<h3>Removing podcast '" +
          podcastName +
          "' will remove all associated episodes and audio files owned by this podcast. This cannot be undone.</h3>" +
          '<br/><br/><h2>Are you sure you want to proceed?</h2>',
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        // get confirmation from user
        this.deletePodcast();
      }
    });
  }

  private deletePodcast() {
    this.subscriptions.add(
      this.podcastsService.deletePodcast(this.podcastId, this.deleteConfirmation).subscribe({
        next: () => {
          this.messageService.success('Podcast deleted successfully');
          this.router.navigate(['/podcasts']);
        },
        error: (err) => {
          this.messageService.error(`Failed to delete podcast: ${err.message}`);
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
    this.podcastsService.uploadPodcastImage(this.podcastId, file).subscribe({
      next: (response) => {
        this.messageService.success('Podcast image uploaded successfully');
        this.podcastForm.patchValue({ imageUrl: response.podcast.imageUrl });
        this.selectedFile = null;
        this.podcastForm.get('image')?.reset();
      },
      error: (error) => {
        this.messageService.error(`Failed to upload podcast image: ${error.message}`);
        this.selectedFile = null;
        this.podcastForm.get('image')?.reset();
      },
    });
  }

  get rssFeeds(): FormArray {
    return this.podcastForm.get('rssFeeds') as FormArray;
  }

  openAddRssFeedDialog(): void {
    const dialogRef = this.dialog.open(AddRssFeedDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addRssFeed(result.url);
      }
    });
  }

  addRssFeed(url: string): void {
    this.rssFeedLoading = true;
    this.subscriptions.add(
      this.podcastsService.createRssFeed(url).subscribe({
        next: (data) => {
          const existingId = this.rssFeeds.controls.findIndex((a) => a.get('id')?.value == data.rssFeed.id);
          if (existingId >= 0) {
            this.messageService.info('RSS Feed already exists');
            this.rssFeedLoading = false;
            return;
          }
          this.rssFeeds.push(
            this.fb.group({
              id: [data.rssFeed.id, Validators.required],
              url: [data.rssFeed.url, Validators.required],
            }),
          );
          this.updateRssFeeds();
        },
        error: (err) => {
          this.messageService.error(`Failed to update RSS Feeds: ${err.message}`);
        },
      }),
    );
  }

  removeRssFeed(feedId: number): void {
    this.rssFeeds.removeAt(this.rssFeeds.controls.findIndex((control) => control.get('id')?.value === feedId));
    this.updateRssFeeds();
  }

  private updateRssFeeds(): void {
    this.rssFeedLoading = true;
    const rssFeedIds = this.rssFeeds.value.map((feed: RssFeedResult) => feed.id);
    this.podcastsService.setPodcastRssFeeds(this.podcastId, rssFeedIds).subscribe({
      next: (data) => {
        this.podcastForm.patchValue(data.podcast);
        this.rssFeedLoading = false;
        this.messageService.success('RSS Feeds updated successfully');
      },
      error: (err) => {
        this.refreshPodcastData();
        this.rssFeedLoading = false;
        this.messageService.error(`Failed to update RSS Feeds: ${err.message}`);
      },
    });
  }
}
