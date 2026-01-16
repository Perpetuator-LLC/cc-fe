// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { MessageService } from '../../message.service';
import { ButtonShowcaseComponent } from '../button-showcase/button-showcase.component';

/**
 * Theme Showcase Component
 *
 * Comprehensive display of all MD3 theme elements, including:
 * - Embedded Button Showcase (full functionality)
 * - Color tokens
 * - Resource link tags
 * - Status badges
 * - Message toasts
 * - Typography
 * - Icons
 *
 * Uses tabs to organize different showcase sections.
 */
@Component({
  selector: 'app-theme-showcase',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    RouterLink,
    ButtonShowcaseComponent,
  ],
  templateUrl: './theme-showcase.component.html',
  styleUrls: ['./theme-showcase.component.scss'],
})
export class ThemeShowcaseComponent {
  private messageService = inject(MessageService);

  // Section scroll helper
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  showSuccessToast(): void {
    this.messageService.success('This is a success message!');
  }

  showErrorToast(): void {
    this.messageService.error('This is an error message!');
  }

  showWarningToast(): void {
    this.messageService.warning('This is a warning message!');
  }

  showInfoToast(): void {
    this.messageService.info('This is an info message!');
  }

  showToastWithPodcastLink(): void {
    const link =
      '<a href="/media/podcasts" class="resource-link-podcast">' +
      '<span class="material-symbols-outlined">mic</span>Morning Brief</a>';
    this.messageService.success(`Job completed! View ${link}`, 8000, true);
  }

  showToastWithStockLink(): void {
    const link =
      '<a href="/terminal" class="resource-link-stock">' +
      '<span class="material-symbols-outlined">show_chart</span>AAPL</a>';
    this.messageService.info(`Price alert triggered for ${link}`, 8000, true);
  }
}
