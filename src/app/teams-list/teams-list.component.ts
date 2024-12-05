import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
import { Subscription } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButton } from '@angular/material/button';

export interface UserResult {
  id: number;
  username: string;
}

export interface MemberResult {
  user: UserResult;
  role: string;
}

export interface TeamsResult {
  id: number;
  name: string;
  podcastUrl: string;
  podcastEnabled: boolean;
  podcastSlug: string;
  intro: string;
  prompt: string;
  outro: string;
  members: MemberResult[];
}

@Component({
  selector: 'app-teams-list',
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
  templateUrl: './teams-list.component.html',
  styleUrls: ['./teams-list.component.scss'],
})
export class TeamsListComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  @Input() teams: TeamsResult[] = [];
  protected loading = false;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private teamsService: TeamsService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loading = true;

    this.subscriptions.add(
      this.teamsService.getMyTeams().subscribe({
        next: (teams: TeamsResult[]) => {
          this.messageService.clearMessages();
          this.teams = teams;
          this.loading = false;
        },
        error: (err: { message: string }) => {
          this.loading = false;
          this.messageService.clearMessages();
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to retrieve teams data: ${err.message}`,
            dismissible: true,
          });
        },
        complete: () => {
          this.loading = false;
        },
      }),
    );
  }

  viewTeam(id: number) {
    this.router.navigate(['/team', id]);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  createTeam() {
    this.router.navigate(['/team/new']);
  }
}
