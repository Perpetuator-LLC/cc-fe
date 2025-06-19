// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { TeamsResult, TeamsService } from '../teams.service';
import { Subscription } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButton, MatButtonModule } from '@angular/material/button';
import {
  MatTable,
  MatTableDataSource,
  MatHeaderCell,
  MatCell,
  MatHeaderRow,
  MatRow,
  MatHeaderCellDef,
  MatCellDef,
  MatHeaderRowDef,
  MatRowDef,
  MatColumnDef,
} from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatTooltip } from '@angular/material/tooltip';
import { SlicePipe } from '@angular/common';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateTeamDialogComponent } from '../create-team-dialog/create-team-dialog.component';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    SvgIconComponent,
    MatIcon,
    MessageComponent,
    MatProgressBarModule,
    MatCardContent,
    MatCardActions,
    MatTable,
    MatSort,
    MatHeaderCell,
    MatCell,
    MatHeaderRow,
    MatRow,
    MatHeaderCellDef,
    MatCellDef,
    MatHeaderRowDef,
    MatRowDef,
    MatColumnDef,
    MatTooltip,
    SlicePipe,
    MatMenuTrigger,
    MatMenu,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatPaginator,
    MatCheckboxModule,
    FormsModule,
    MatDialogModule,
  ],
  templateUrl: './teams-list.component.html',
  styleUrls: ['./teams-list.component.scss'],
})
export class TeamsListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private subscriptions = new Subscription();
  @Input() teams: TeamsResult[] = [];
  protected loading = false;
  dataSource = new MatTableDataSource<TeamsResult>([]);
  displayedColumns: string[] = ['name', 'members', 'podcast', 'actions'];
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadTeams();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadTeams(): void {
    this.loading = true;
    this.subscriptions.add(
      this.teamsService.getTeams().subscribe({
        next: (response) => {
          this.messageService.clearMessages();
          this.teams = response.teams;
          this.dataSource = new MatTableDataSource(this.teams);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
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

  viewTeam(uuid: string) {
    this.router.navigate(['/team', uuid]);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  createTeam(): void {
    this.dialog
      .open(CreateTeamDialogComponent, {
        width: '400px',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.team) {
          this.messageService.success('Team created successfully');
          this.teams.push(result.team);
          this.dataSource.data = this.teams;
        }
      });
  }
}
