// Copyright (c) 2025 Perpetuator LLC

import { Component, OnInit, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PodcastsService } from '../podcasts.service';

// Import Angular Material Modules needed for the template
import { MatListModule } from '@angular/material/list';
// Import MatCheckboxChange along with MatCheckboxModule
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-podcast-categories',
  standalone: true,
  imports: [CommonModule, MatListModule, MatCheckboxModule, MatExpansionModule],
  templateUrl: './podcast-categories.component.html',
  styleUrl: './podcast-categories.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PodcastCategoriesComponent),
      multi: true,
    },
  ],
})
export class PodcastCategoriesComponent implements OnInit, ControlValueAccessor {
  categoriesMap: Record<string, string[]> = {};
  parentCategories: string[] = [];
  value: Record<string, string[]> = {};

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: Record<string, string[]>) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  constructor(private podcastsService: PodcastsService) {}

  ngOnInit() {
    this.podcastsService.getPodcastCategories().subscribe((categories) => {
      this.categoriesMap = categories;
      this.parentCategories = Object.keys(this.categoriesMap);
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

  isParentSelected(parent: string): boolean {
    return parent in this.value;
  }

  isSubSelected(parent: string, sub: string): boolean {
    return this.value[parent]?.includes(sub) || false;
  }

  // Update the event type from 'Event' to 'MatCheckboxChange'
  toggleParentCategory(parent: string) {
    // Note: We don't actually need to use event.checked here because
    // the logic correctly toggles based on the *current* state before the change.
    // We determine the *new* state based on `isParentSelected(parent)`.
    const newValue = { ...this.value };
    if (this.isParentSelected(parent)) {
      delete newValue[parent]; // Deselect parent and all subs
    } else {
      newValue[parent] = []; // Select parent with no subs initially
    }
    this.value = newValue;
    this.updateModel();
  }

  // Update the event type from 'Event' to 'MatCheckboxChange'
  toggleSubCategory(parent: string, sub: string) {
    // Similar to toggleParentCategory, event.checked isn't strictly needed here
    // as the logic relies on the pre-change state via `isSubSelected`.
    const newValue = { ...this.value };

    if (!newValue[parent]) {
      // If parent doesn't exist yet (e.g., checking first sub before parent), add it.
      newValue[parent] = [];
    }

    const currentSubs = newValue[parent] || [];
    if (this.isSubSelected(parent, sub)) {
      // Deselect sub
      newValue[parent] = currentSubs.filter((s) => s !== sub);
    } else {
      // Select sub
      newValue[parent] = [...currentSubs, sub];
    }

    this.value = newValue;
    this.updateModel();
  }

  getSubcategories(parent: string): string[] {
    return this.categoriesMap[parent] || [];
  }
}
