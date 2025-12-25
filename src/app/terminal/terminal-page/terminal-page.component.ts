// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { TerminalService } from '../terminal.service';
import { TerminalInputComponent } from '../terminal-input/terminal-input.component';
import { TerminalDashboardComponent } from '../terminal-dashboard/terminal-dashboard.component';

@Component({
  selector: 'app-terminal-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatSidenavModule,
    MatTooltipModule,
    TerminalInputComponent,
    TerminalDashboardComponent,
  ],
  templateUrl: './terminal-page.component.html',
  styleUrl: './terminal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPageComponent implements OnInit, OnDestroy {
  isTerminalExpanded = true;
  selectedTabIndex = 0;
  private subscriptions = new Subscription();

  constructor(protected terminalService: TerminalService) {}

  ngOnInit(): void {
    // Load available commands on init
    this.subscriptions.add(
      this.terminalService.loadCommands().subscribe({
        next: (commands) => {
          console.debug('Loaded commands:', commands.length);
        },
        error: (error) => {
          console.error('Failed to load commands:', error);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleTerminal(): void {
    this.isTerminalExpanded = !this.isTerminalExpanded;
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }
}
