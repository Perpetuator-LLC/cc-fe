// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { PodcastsService } from '../podcasts.service';
import { Subscription } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButton } from '@angular/material/button';
import { TeamsResult } from '../teams-list/teams-list.component';

export interface UserResult {
  id: number;
  username: string;
}

export interface MemberResult {
  user: UserResult;
  role: string;
}

export interface RssFeedResult {
  id: number;
  url: string;
}

export interface PodcastsResult {
  id: number;
  team: TeamsResult;
  name: string | null;
  url: string | null;
  enabled: boolean;
  slug: string | null;
  image: string | null;
  imageUrl: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerLink: string | null;
  intro: string | null;
  prompt: string | null;
  outro: string | null;
  tgChannelId: string | null;
  tgResponse: string | null;
  rssFeeds: RssFeedResult[];
}

@Component({
  selector: 'app-podcasts-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatIcon,
    MessageComponent,
    MatProgressSpinner,
    MatCardContent,
    MatCardActions,
  ],
  templateUrl: './podcasts-list.component.html',
  styleUrls: ['./podcasts-list.component.scss'],
})
export class PodcastsListComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  @Input() podcasts: PodcastsResult[] = [];
  protected loading = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private podcastsService: PodcastsService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loading = true;

    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (podcasts: PodcastsResult[]) => {
          this.messageService.clearMessages();
          this.podcasts = podcasts;
          this.loading = false;
        },
        error: (err: { message: string }) => {
          this.loading = false;
          this.messageService.clearMessages();
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to retrieve podcasts data: ${err.message}`,
            dismissible: true,
          });
        },
        complete: () => {
          this.loading = false;
        },
      }),
    );
  }

  viewPodcast(id: number) {
    this.router.navigate(['/podcast', id]);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  createPodcast() {
    this.router.navigate(['/podcast/new']);
  }
}
