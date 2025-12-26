// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { TerminalService } from '../terminal.service';
import { TerminalBarComponent } from '../terminal-bar/terminal-bar.component';
import { TerminalDashboardComponent } from '../terminal-dashboard/terminal-dashboard.component';

@Component({
  selector: 'app-terminal-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatTooltipModule,
    TerminalBarComponent,
    TerminalDashboardComponent,
  ],
  templateUrl: './terminal-page.component.html',
  styleUrl: './terminal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPageComponent implements OnInit, OnDestroy {
  selectedTabIndex = 0;
  private subscriptions = new Subscription();

  constructor(protected terminalService: TerminalService) {}

  ngOnInit(): void {
    // Load available commands from backend registry
    this.subscriptions.add(
      this.terminalService.loadCommands().subscribe({
        next: (commands) => {
          console.debug('Loaded commands:', commands.length);
        },
        error: () => {
          // Commands query failed - terminal still works via WebSocket
          console.debug('Commands registry not available - using WebSocket commands');
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }
}
