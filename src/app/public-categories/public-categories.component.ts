// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { PublicPodcastHttpService, Category } from '../public-podcast-http.service';
import { MessageService } from '../message.service';

@Component({
  selector: 'app-public-categories',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './public-categories.component.html',
  styleUrl: './public-categories.component.scss',
})
export class PublicCategoriesComponent implements OnInit {
  categories: { name: string; data: Category }[] = [];
  loading = true;

  constructor(
    private publicPodcastService: PublicPodcastHttpService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;

    this.publicPodcastService.getCategories().subscribe({
      next: (data) => {
        this.categories = Object.entries(data.categories).map(([name, category]) => ({
          name,
          data: category,
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.loading = false;
        this.messageService.error('Failed to load categories');
      },
    });
  }

  getCategoryUrl(category: string): string {
    return `/c/${encodeURIComponent(category)}`;
  }

  getSubcategoryUrl(category: string, subcategory: string): string {
    return `/c/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}`;
  }
}
