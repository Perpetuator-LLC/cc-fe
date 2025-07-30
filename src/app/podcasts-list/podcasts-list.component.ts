// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, OnDestroy, OnInit, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { PodcastsResult, PodcastsService } from '../podcasts.service';
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
import { MatDialog } from '@angular/material/dialog';
import { CreatePodcastDialogComponent } from '../create-podcast-dialog/create-podcast-dialog.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

export interface ColumnOption {
  id: string;
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-podcasts-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    SvgIconComponent,
    MatCardTitle,
    MatCardHeader,
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
  ],
  templateUrl: './podcasts-list.component.html',
  styleUrls: ['./podcasts-list.component.scss'],
})
export class PodcastsListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private subscriptions = new Subscription();
  @Input() podcasts: PodcastsResult[] = [];
  protected loading = false;
  dataSource = new MatTableDataSource<PodcastsResult>([]);
  displayedColumns: string[] = ['name', 'team', 'tgChannelId', 'categories', 'tgResponse', 'actions'];
  isGridView = false; // Default to list view
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  allColumns: ColumnOption[] = [
    { id: 'name', label: 'Podcast Name', selected: true },
    { id: 'team', label: 'Team', selected: true },
    { id: 'tgChannelId', label: 'Telegram ID', selected: true },
    { id: 'categories', label: 'Categories', selected: true },
    { id: 'tgResponse', label: 'Response', selected: true },
    { id: 'actions', label: 'Actions', selected: true },
  ];

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private podcastsService: PodcastsService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadPodcasts();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadPodcasts(): void {
    this.loading = true;
    this.subscriptions.add(
      this.podcastsService.getPodcasts().subscribe({
        next: (response) => {
          this.messageService.clearMessages();
          this.podcasts = response.podcasts;
          this.dataSource = new MatTableDataSource(this.podcasts);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
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

  viewPodcast(uuid: string) {
    this.router.navigate(['/podcast', uuid]);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  createPodcast(): void {
    const dialogRef = this.dialog.open(CreatePodcastDialogComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Refresh the podcasts list
        this.loadPodcasts();
      }
    });
  }

  getCategoriesString(categories: Record<string, string[]> | null): string {
    if (!categories) return '-';
    return Object.entries(categories)
      .map(([key, values]) => `${key}: ${values.join(', ')}`)
      .join('; ');
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  // Placeholder methods for menu actions
  moveToDraft(uuid: string) {
    console.log('Move to draft:', uuid);
    // Implement move to draft logic here
  }

  changeCategory(uuid: string) {
    console.log('Change category:', uuid);
    // Implement change category logic here
  }

  duplicatePodcast(uuid: string) {
    console.log('Duplicate podcast:', uuid);
    // Implement duplicate podcast logic here
  }

  archivePodcast(uuid: string) {
    console.log('Archive podcast:', uuid);
    // Implement archive podcast logic here
  }

  updateDisplayedColumns(): void {
    this.displayedColumns = this.allColumns.filter((column) => column.selected).map((column) => column.id);
  }

  _countCategories(podcast: PodcastsResult) {
    return podcast?.categories ? Object.keys(podcast?.categories)?.length : 0;
  }
}
