// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, ViewChild, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatButton, MatFabButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ToolbarService } from '../layout/toolbar.service';
import { NewsletterDialogComponent } from '../news/newsletter-dialog/newsletter-dialog.component';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatButton,
    MatFabButton,
    MatMiniFabButton,
    MatIcon,
    RouterLink,
  ],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class FinanceComponent implements OnInit {
  private toolbarService = inject(ToolbarService);
  private dialog = inject(MatDialog);

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  currentSlide = 0;
  slides = [
    {
      title: 'AI-Powered DCF Dashboard Creation',
      description:
        'Generate comprehensive discounted cash flow analysis dashboards instantly. ' +
        'AI builds custom valuation models with real-time data and interactive visualizations.',
      image: '/assets/concept_dcf.webp',
    },
    {
      title: 'AI-Generated Dividend Stock Metrics',
      description:
        'Instantly create comprehensive dividend analysis dashboards powered by AI. ' +
        'Track yield, payout ratios, growth rates, and dividend sustainability metrics in real-time.',
      image: '/assets/concept_dividend.webp',
    },
    {
      title: 'AI-Generated Recession Monitoring Dashboard',
      description:
        'Transform simple prompts into sophisticated recession analysis dashboards. ' +
        'AI interprets your questions and builds custom economic indicators tracking real-time market conditions.',
      image: '/assets/concept_recession.webp',
    },
  ];

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
  }

  openNewsletterDialog(): void {
    this.dialog.open(NewsletterDialogComponent, {
      width: '500px',
      disableClose: false,
    });
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide(): void {
    this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }
}
