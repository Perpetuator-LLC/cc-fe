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
        // Handle both object and array responses
        const categoriesData = data.categories;

        if (Array.isArray(categoriesData)) {
          // Check if it's an array of strings or Category objects
          if (categoriesData.length > 0 && typeof categoriesData[0] === 'string') {
            // Array of strings - convert to Category objects
            const stringArray = categoriesData as string[];
            this.categories = stringArray.map((categoryName) => ({
              name: categoryName,
              data: {
                name: categoryName,
                subcategories: [],
                podcastCount: 0,
              },
            }));
          } else {
            // Array of Category objects
            const categoryArray = categoriesData as Category[];
            this.categories = categoryArray.map((category, index) => {
              // API uses 'category' property, not 'name'
              const asRecord = category as unknown as Record<string, unknown>;
              const categoryName =
                (typeof asRecord['category'] === 'string' ? asRecord['category'] : category.name) ||
                `Category ${index}`;
              return {
                name: categoryName,
                data: {
                  name: categoryName,
                  subcategories: category.subcategories || [],
                  podcastCount: category.podcastCount || 0,
                },
              };
            });
          }
        } else if (typeof categoriesData === 'object') {
          // If it's an object, use the key as the name
          // console.log('Processing as object, keys:', Object.keys(categoriesData));
          const categoryObject = categoriesData as Record<string, Category>;
          this.categories = Object.entries(categoryObject).map(([name, category]) => {
            // console.log(`Category key: ${name}`, 'value:', category);
            return {
              name: name,
              data: category,
            };
          });
        } else {
          console.error('Unexpected categories data format:', typeof categoriesData);
          this.categories = [];
        }

        // console.log('Final categories array:', this.categories);
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
    return `/categories/${encodeURIComponent(category)}`;
  }

  getSubcategoryUrl(category: string, subcategory: string): string {
    return `/categories/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}`;
  }

  decodeCategory(category: string): string {
    try {
      return decodeURIComponent(category);
    } catch {
      return category;
    }
  }
}
