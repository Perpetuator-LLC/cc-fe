// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PodcastsService } from '../podcasts.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

interface CategoryOption {
  value: string;
  label: string;
  isParent: boolean;
  parent?: string;
}

@Component({
  selector: 'app-create-podcast-categories',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatChipsModule, MatIconModule],
  template: `
    <div class="categories-container">
      <mat-form-field appearance="fill" class="category-select">
        <mat-label>Select Categories</mat-label>
        <mat-select (selectionChange)="onCategorySelectionChange($event.value)" [value]="getSelectedValues()" multiple>
          @for (option of categoryOptions; track option.value) {
            @if (option.isParent) {
              <mat-option [value]="option.value" class="parent-option">
                <strong>{{ option.label }}</strong>
              </mat-option>
            } @else {
              <mat-option [value]="option.value" class="subcategory-option">
                &nbsp;&nbsp;&nbsp;&nbsp;{{ option.label }}
              </mat-option>
            }
          }
        </mat-select>
      </mat-form-field>

      <div class="selected-chips">
        @for (category of getAllSelectedCategories(); track category) {
          <mat-chip [removable]="true" (removed)="removeCategory(category)">
            {{ category }}
            <button matChipRemove>
              <mat-icon>cancel</mat-icon>
            </button>
          </mat-chip>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .categories-container {
        margin-top: 1rem;
      }
      .category-select {
        width: 100%;
        margin-bottom: 0.5rem;
      }
      .selected-chips {
        margin-bottom: 1rem;
      }
      .selected-chips mat-chip {
        margin: 0.25rem;
      }
      .parent-option {
        font-weight: bold;
        background-color: var(--secondary-light);
      }
      .subcategory-option {
        font-weight: normal;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CreatePodcastCategoriesComponent),
      multi: true,
    },
  ],
})
export class CreatePodcastCategoriesComponent implements OnInit, ControlValueAccessor {
  categoriesMap: Record<string, string[]> = {};
  categoryOptions: CategoryOption[] = [];
  value: Record<string, string[]> = {};

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: Record<string, string[]>) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  constructor(private podcastsService: PodcastsService) {}

  ngOnInit() {
    this.podcastsService.getPodcastCategories().subscribe((categories) => {
      this.categoriesMap = categories;
      this.buildCategoryOptions();
    });
  }

  private buildCategoryOptions() {
    this.categoryOptions = [];

    Object.keys(this.categoriesMap).forEach((parent) => {
      // Add parent category as an option
      this.categoryOptions.push({
        value: `parent:${parent}`,
        label: parent,
        isParent: true,
      });

      // Add subcategories as options
      this.categoriesMap[parent].forEach((sub) => {
        this.categoryOptions.push({
          value: `sub:${parent}:${sub}`,
          label: sub,
          isParent: false,
          parent: parent,
        });
      });
    });
  }

  writeValue(obj: Record<string, string[]> | null): void {
    this.value = obj || {};
  }

  registerOnChange(fn: (value: Record<string, string[]>) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  private updateModel() {
    this.onChange(this.value);
    this.onTouched();
  }

  getSelectedValues(): string[] {
    const selectedValues: string[] = [];

    Object.keys(this.value).forEach((parent) => {
      // Add subcategories only
      this.value[parent]?.forEach((sub) => {
        selectedValues.push(`sub:${parent}:${sub}`);
      });
    });

    return selectedValues;
  }

  getAllSelectedCategories(): string[] {
    const allCategories: string[] = [];

    Object.keys(this.value).forEach((parent) => {
      this.value[parent]?.forEach((sub) => {
        allCategories.push(`${parent} > ${sub}`);
      });
    });

    return allCategories;
  }

  onCategorySelectionChange(selectedValues: string[]) {
    const newValue: Record<string, string[]> = {};

    selectedValues.forEach((value) => {
      if (value.startsWith('sub:')) {
        const parts = value.replace('sub:', '').split(':');
        if (parts.length === 2) {
          const [parent, sub] = parts;
          if (!newValue[parent]) {
            newValue[parent] = [];
          }
          if (!newValue[parent].includes(sub)) {
            newValue[parent].push(sub);
          }
        }
      }
    });

    this.value = newValue;
    this.updateModel();
  }

  removeCategory(category: string) {
    const parts = category.split(' > ');
    if (parts.length === 2) {
      const [parent, sub] = parts;
      const newValue = { ...this.value };

      if (newValue[parent]) {
        newValue[parent] = newValue[parent].filter((c) => c !== sub);
        if (newValue[parent].length === 0) {
          delete newValue[parent];
        }
      }

      this.value = newValue;
      this.updateModel();
    }
  }
}
