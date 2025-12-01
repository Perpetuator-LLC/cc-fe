// Copyright (c) 2025 Perpetuator LLC

import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PodcastsService } from '../podcasts.service';

import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-podcast-categories',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
  ],
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
  @Input() pendingCategories: Record<string, string[]> = {};

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

  isPending(parent: string, sub?: string): boolean {
    if (sub) {
      // Only check subcategory pending state if the parent is currently selected
      if (!this.pendingCategories[parent]) {
        return false;
      }
      const isCurrentlySelected = this.isSubSelected(parent, sub);
      const wasSubmittedSelected = this.pendingCategories[parent]?.includes(sub);
      return isCurrentlySelected !== wasSubmittedSelected;
    } else {
      // Check if parent category is pending
      const isCurrentlySelected = this.isParentSelected(parent);
      const wasSubmittedSelected = !!this.pendingCategories[parent];
      return isCurrentlySelected !== wasSubmittedSelected;
    }
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

  getSelectedSubcategories(parent: string): string[] {
    return this.value[parent] || [];
  }

  onSubcategorySelectionChange(parent: string, selectedSubs: string[]) {
    const newValue = { ...this.value };
    if (!newValue[parent] && selectedSubs.length > 0) {
      // If parent isn't selected but subs are, select the parent
      newValue[parent] = [];
    }

    newValue[parent] = selectedSubs;

    // If a parent has no selected subcategories but is still in the value object,
    // you might want to decide if it should be removed.
    // For now, we'll keep it to signify the parent itself is "checked".
    // If you want to deselect the parent when all subs are deselected, you'd add:
    // if (newValue[parent].length === 0) {
    //   delete newValue[parent];
    // }

    this.value = newValue;
    this.updateModel();
  }

  removeSubcategory(parent: string, sub: string): void {
    const selectedSubs = this.getSelectedSubcategories(parent).filter((s) => s !== sub);
    this.onSubcategorySelectionChange(parent, selectedSubs);
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

  getSubcategories(parent: string): string[] {
    return this.categoriesMap[parent] || [];
  }

  // Returns true if all subcategories for the parent are selected
  areAllSubcategoriesSelected(parent: string): boolean {
    const subcategories = this.getSubcategories(parent);
    const selected = this.getSelectedSubcategories(parent);
    return subcategories.length > 0 && subcategories.every((sub) => selected.includes(sub));
  }

  // Selects or deselects all subcategories for the parent
  toggleSelectAllSubcategories(parent: string, checked: boolean): void {
    const subcategories = this.getSubcategories(parent);
    const newValue = { ...this.value };
    if (checked) {
      newValue[parent] = [...subcategories];
    } else {
      newValue[parent] = [];
    }
    this.value = newValue;
    this.updateModel();
  }
}
