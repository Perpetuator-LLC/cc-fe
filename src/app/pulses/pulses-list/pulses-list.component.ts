// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ToolbarService } from '../../layout/toolbar.service';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { PulseConfig } from '../pulses.types';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButton, MatButtonModule } from '@angular/material/button';
import {
  MatTable,
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
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { CreatePulseDialogComponent } from '../create-pulse-dialog/create-pulse-dialog.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { Job, JobService } from '../../jobs/job.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { LoadingService } from '../../layout/loading.service';
import { RelayPaginatorBase } from '../../utils/relay-paginator';
import { LabeledSelectComponent, LabeledSelectOption } from '../../shared/labeled-select/labeled-select.component';

export interface ColumnOption {
  id: string;
  label: string;
  selected: boolean;
}

/** Pre-computed display fields attached to each pulse row. */
interface PulseDisplay {
  formattedSchedule: string;
  formattedLastGenerated: string;
}
type PulseConfigWithDisplay = PulseConfig & PulseDisplay;

@Component({
  selector: 'app-pulses-list',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatIcon,
    MatProgressBarModule,
    MatCardContent,
    MatTable,
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
    MatMenuTrigger,
    MatMenu,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatPaginator,
    MatCheckboxModule,
    FormsModule,
    MatMenuItem,
    LabeledSelectComponent,
  ],
  templateUrl: './pulses-list.component.html',
  styleUrls: ['./pulses-list.component.scss'],
})
export class PulsesListComponent extends RelayPaginatorBase<PulseConfigWithDisplay> implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  private _pulseConfigs: PulseConfigWithDisplay[] = [];
  /** Setter enriches each PulseConfig with pre-computed display strings. */
  set pulseConfigs(value: PulseConfig[]) {
    this._pulseConfigs = (value || []).map((c) => ({
      ...c,
      formattedSchedule: this.formatSchedule(c),
      formattedLastGenerated: this.formatTimeAgo(c.lastGeneratedAt),
    }));
  }
  get pulseConfigs(): PulseConfigWithDisplay[] {
    return this._pulseConfigs;
  }
  protected loading = false;
  displayedColumns: string[] = ['name', 'schedule', 'lastGeneratedAt', 'isActive', 'generate', 'actions'];
  isGridView = false;
  pageSizeOptions = [5, 10, 25, 50];
  hasNextPage = false;
  hasPreviousPage = false;
  totalPulseConfigs = 0;
  allColumns: ColumnOption[] = [
    { id: 'name', label: 'Pulse Name', selected: true },
    { id: 'schedule', label: 'Schedule', selected: true },
    { id: 'lastGeneratedAt', label: 'Last Generated', selected: true },
    { id: 'isActive', label: 'Active', selected: true },
    { id: 'generate', label: 'Generate', selected: true },
    { id: 'actions', label: 'Actions', selected: true },
  ];
  searchString: string | null = null;
  searchTerm$ = new Subject<string>();
  jobs: Job[] = [];
  selectedActiveStatus: string | null = null;
  orderBy = '-updated_at';

  readonly allStatusOption: LabeledSelectOption = { value: null, label: 'All Status' };
  readonly statusOptions: LabeledSelectOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly toolbarService = inject(ToolbarService);
  private readonly pulsesService = inject(PulsesService);
  private readonly dialog = inject(MatDialog);
  private readonly jobService = inject(JobService);
  private readonly loadingService = inject(LoadingService);

  constructor() {
    super();

    this.searchTerm$.pipe(debounceTime(1000), distinctUntilChanged()).subscribe((term) => {
      this.searchString = term;
      this.cursors = [null];
      if (this.paginator) {
        this.paginator.firstPage();
      }
      this.loadPage(this.pageSize, null, 0);
    });

    // Subscribe to job updates
    this.subscriptions.add(
      toObservable(this.jobService.jobs).subscribe({
        next: (jobs) => {
          this.jobs = jobs;
        },
        error: (error) => {
          this.messageService.error(`Failed to load jobs signal: ${error.message}`);
        },
      }),
    );
  }

  ngOnInit(): void {
    this.messageService.clearMessages();
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.loadPage(this.pageSize, null, 0);

    // Check for query parameter to auto-open create dialog
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        if (params['create'] === 'true') {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
          setTimeout(() => this.createPulseConfig(), 0);
        }
      }),
    );
  }

  protected loadPage(pageSize: number, cursor: string | null, pageIndex: number): void {
    this.loading = true;
    this.loadingService.show();

    let isActiveFilter: boolean | undefined = undefined;
    if (this.selectedActiveStatus === 'active') {
      isActiveFilter = true;
    } else if (this.selectedActiveStatus === 'inactive') {
      isActiveFilter = false;
    }

    this.subscriptions.add(
      this.pulsesService
        .getPulseConfigs(pageSize, cursor, this.searchString || undefined, isActiveFilter, this.orderBy)
        .subscribe({
          next: (response) => {
            this.messageService.clearMessages();
            this.pulseConfigs = response.pulseConfigs;
            this.hasNextPage = response.pageInfo.hasNextPage;
            this.hasPreviousPage = response.pageInfo.hasPreviousPage;

            this.handlePageData(this.pulseConfigs, response.pageInfo, pageIndex);
            this.totalPulseConfigs = this.totalItems;

            this.loading = false;
            this.loadingService.hide();
          },
          error: (err: { message: string }) => {
            this.loading = false;
            this.loadingService.hide();
            this.messageService.error(`Failed to retrieve pulse configs: ${err.message}`);
          },
          complete: () => {
            this.loading = false;
            this.loadingService.hide();
          },
        }),
    );
  }

  viewPulseConfig(uuid: string) {
    this.router.navigate(['/media/pulses', uuid]);
  }

  protected formatTimeAgo(dateString: string | null | undefined): string {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  protected formatSchedule(config: PulseConfig): string {
    const frequency = config.scheduleFrequency;
    const time = config.scheduleTime || '07:00';

    switch (frequency) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekdays':
        return `Weekdays at ${time}`;
      case 'weekly':
        return `Weekly at ${time}`;
      case 'once':
        return 'One-time';
      case 'custom':
        return `Custom at ${time}`;
      default:
        return frequency;
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  createPulseConfig(): void {
    const dialogRef = this.dialog.open(CreatePulseDialogComponent, {
      width: '500px',
      panelClass: 'create-pulse-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPage(this.pageSize, null, 0);
      }
    });
  }

  onStatusSelectChange(value: unknown): void {
    this.selectedActiveStatus = (value as string | null) ?? null;
    this.onActiveStatusFilterChange();
  }

  onActiveStatusFilterChange(): void {
    this.cursors = [null];
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadPage(this.pageSize, null, 0);
  }

  onSortChange(field: string) {
    if (this.orderBy === field || this.orderBy === `-${field}`) {
      if (this.orderBy === field) {
        this.orderBy = `-${field}`;
      } else {
        this.orderBy = field;
      }
    } else {
      this.orderBy = `-${field}`;
    }

    this.cursors = [null];
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadPage(this.pageSize, null, 0);
  }

  getSortDirection(field: string): 'asc' | 'desc' | null {
    if (this.orderBy === field) return 'asc';
    if (this.orderBy === `-${field}`) return 'desc';
    return null;
  }

  /** Pre-computed sort direction getters used by the template (no-arg property access). */
  get sortDirectionName(): 'asc' | 'desc' | null {
    return this.getSortDirection('name');
  }
  get sortDirectionLastGenerated(): 'asc' | 'desc' | null {
    return this.getSortDirection('last_generated_at');
  }

  toggleView(isGrid: boolean) {
    this.isGridView = isGrid;
  }

  updateDisplayedColumns(): void {
    this.displayedColumns = this.allColumns.filter((column) => column.selected).map((column) => column.id);
  }

  isColumnSelected(columnId: string): boolean {
    const column = this.allColumns.find((col) => col.id === columnId);
    return column ? column.selected : false;
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm$.next(value);
  }

  generatePulse(pulseConfigUuid: string) {
    this.subscriptions.add(
      this.pulsesService.generatePulse(pulseConfigUuid).subscribe({
        next: (data) => {
          this.messageService.info('Generating pulse...');
          // Track job via WebSocket - the job service handles updates
          if (data.jobUuid) {
            this.jobService.addJob({
              uuid: data.jobUuid,
              kind: 'generate_pulse',
              status: 'pending',
              createdAt: new Date().toISOString(),
            } as Job);
          }
        },
        error: (err: Error) => {
          this.messageService.error(`Failed to generate pulse: ${err.message}`);
        },
      }),
    );
  }
}
