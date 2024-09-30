import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MatLine } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { DatePipe } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { TeamsService } from '../teams.service';
import { Subscription } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
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
  members: MemberResult[];
}

// export interface MyTeamsData {
//   success: boolean;
//   message: string;
//   results: TeamsResult[];
// }

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatList,
    MatListItem,
    MatIcon,
    RouterLink,
    MatLine,
    MatDivider,
    MatFormField,
    MatInput,
    MatLabel,
    MessageComponent,
    DatePipe,
    MatProgressSpinner,
    MatTooltip,
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
          console.log('Retrieve teams complete');
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
