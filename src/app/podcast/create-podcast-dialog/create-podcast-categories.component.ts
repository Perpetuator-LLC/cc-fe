// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PodcastsService } from '../podcasts.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconButton } from '@angular/material/button';
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
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatChipsModule, MatIconButton, MatIconModule],
  templateUrl: './create-podcast-categories.component.html',
  styleUrl: './create-podcast-categories.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CreatePodcastCategoriesComponent),
      multi: true,
    },
  ],
})
export class CreatePodcastCategoriesComponent implements OnInit, ControlValueAccessor {
  private podcastsService = inject(PodcastsService);

  categoriesMap: Record<string, string[]> = {};
  categoryOptions: CategoryOption[] = [];
  value: Record<string, string[]> = {};

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: Record<string, string[]>) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

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
    this.rebuildSelectedDisplay();
  }

  registerOnChange(fn: (value: Record<string, string[]>) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Pre-computed selected values + display labels. Rebuilt on every model update. */
  selectedValues: string[] = [];
  allSelectedCategories: string[] = [];

  private rebuildSelectedDisplay(): void {
    const values: string[] = [];
    const labels: string[] = [];
    Object.keys(this.value).forEach((parent) => {
      this.value[parent]?.forEach((sub) => {
        values.push(`sub:${parent}:${sub}`);
        labels.push(`${parent} > ${sub}`);
      });
    });
    this.selectedValues = values;
    this.allSelectedCategories = labels;
  }

  private updateModel() {
    this.onChange(this.value);
    this.onTouched();
    this.rebuildSelectedDisplay();
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
