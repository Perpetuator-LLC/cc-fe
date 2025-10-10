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
      const allSubcategories = this.categoriesMap[parent] || [];
      const selectedSubcategories = this.value[parent] || [];

      if (allSubcategories.length > 0 && allSubcategories.every((sub) => selectedSubcategories.includes(sub))) {
        selectedValues.push(`parent:${parent}`);
        selectedSubcategories.forEach((sub) => {
          selectedValues.push(`sub:${parent}:${sub}`);
        });
      } else {
        selectedSubcategories.forEach((sub) => {
          selectedValues.push(`sub:${parent}:${sub}`);
        });
      }
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

  getVisibleCategories(): { visible: string[]; remainingCount: number } {
    const allCategories = this.getAllSelectedCategories();
    const maxVisible = 2;

    if (allCategories.length <= maxVisible) {
      return { visible: allCategories, remainingCount: 0 };
    }

    return {
      visible: allCategories.slice(0, maxVisible),
      remainingCount: allCategories.length - maxVisible,
    };
  }

  onCategorySelectionChange(selectedValues: string[]) {
    const newValue: Record<string, string[]> = {};

    const selectionsByParent: Record<string, { parent: boolean; subcategories: string[] }> = {};

    selectedValues.forEach((value) => {
      if (value.startsWith('parent:')) {
        const parent = value.replace('parent:', '');
        if (!selectionsByParent[parent]) {
          selectionsByParent[parent] = { parent: false, subcategories: [] };
        }
        selectionsByParent[parent].parent = true;
      } else if (value.startsWith('sub:')) {
        const parts = value.replace('sub:', '').split(':');
        if (parts.length === 2) {
          const [parent, sub] = parts;
          if (!selectionsByParent[parent]) {
            selectionsByParent[parent] = { parent: false, subcategories: [] };
          }
          selectionsByParent[parent].subcategories.push(sub);
        }
      }
    });

    Object.keys(selectionsByParent).forEach((parent) => {
      const selection = selectionsByParent[parent];

      if (selection.parent && selection.subcategories.length === 0) {
        if (this.categoriesMap[parent]) {
          newValue[parent] = [...this.categoriesMap[parent]];
        }
      } else if (selection.subcategories.length > 0) {
        newValue[parent] = [...selection.subcategories];
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
