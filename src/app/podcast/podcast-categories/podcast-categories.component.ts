// Copyright (c) 2025-2026 Perpetuator LLC

import { Component, Input, OnInit, forwardRef, inject } from '@angular/core';
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

/** Pre-computed display state for a parent category row. */
interface ParentDisplay {
  parent: string;
  isSelected: boolean;
  isPending: boolean;
  subcategories: string[];
  selectedSubcategories: string[];
  allSubcategoriesSelected: boolean;
  hasSubcategories: boolean;
  subDisplay: { sub: string; isPending: boolean }[];
}

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
  private podcastsService = inject(PodcastsService);

  categoriesMap: Record<string, string[]> = {};
  parentCategories: string[] = [];
  value: Record<string, string[]> = {};

  private _pendingCategories: Record<string, string[]> = {};
  @Input() set pendingCategories(value: Record<string, string[]>) {
    this._pendingCategories = value || {};
    this.rebuildParentDisplay();
  }
  get pendingCategories(): Record<string, string[]> {
    return this._pendingCategories;
  }

  /**
   * Pre-built display data for the template. Rebuilt whenever value /
   * pendingCategories / categoriesMap change so the template can read
   * property accesses instead of calling derivation methods per
   * change-detection tick.
   */
  parentDisplay: ParentDisplay[] = [];

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: Record<string, string[]>) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  ngOnInit() {
    this.podcastsService.getPodcastCategories().subscribe((categories) => {
      this.categoriesMap = categories;
      this.parentCategories = Object.keys(this.categoriesMap);
      this.rebuildParentDisplay();
    });
  }

  /** Compose the `parentDisplay` array from current state. */
  private rebuildParentDisplay(): void {
    this.parentDisplay = this.parentCategories.map((parent) => {
      const subs = this.categoriesMap[parent] || [];
      const selectedSubs = this.value[parent] || [];
      const isSelected = parent in this.value;
      return {
        parent,
        isSelected,
        isPending: this.computeParentPending(parent, isSelected),
        subcategories: subs,
        selectedSubcategories: selectedSubs,
        allSubcategoriesSelected: subs.length > 0 && subs.every((s) => selectedSubs.includes(s)),
        hasSubcategories: subs.length > 0,
        subDisplay: subs.map((sub) => ({
          sub,
          isPending: this.computeSubPending(parent, sub, selectedSubs.includes(sub)),
        })),
      };
    });
  }

  private computeParentPending(parent: string, isCurrentlySelected: boolean): boolean {
    const wasSubmittedSelected = !!this._pendingCategories[parent];
    return isCurrentlySelected !== wasSubmittedSelected;
  }

  private computeSubPending(parent: string, sub: string, isCurrentlySelected: boolean): boolean {
    if (!this._pendingCategories[parent]) return false;
    const wasSubmittedSelected = this._pendingCategories[parent]?.includes(sub);
    return isCurrentlySelected !== wasSubmittedSelected;
  }

  isPending(parent: string, sub?: string): boolean {
    if (sub) {
      if (!this._pendingCategories[parent]) return false;
      const isCurrentlySelected = this.isSubSelected(parent, sub);
      const wasSubmittedSelected = this._pendingCategories[parent]?.includes(sub);
      return isCurrentlySelected !== wasSubmittedSelected;
    }
    return this.computeParentPending(parent, this.isParentSelected(parent));
  }

  writeValue(obj: Record<string, string[]> | null): void {
    this.value = obj || {};
    this.rebuildParentDisplay();
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
    this.rebuildParentDisplay();
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

    this.value = newValue;
    this.updateModel();
  }

  removeSubcategory(parent: string, sub: string): void {
    const selectedSubs = this.getSelectedSubcategories(parent).filter((s) => s !== sub);
    this.onSubcategorySelectionChange(parent, selectedSubs);
  }

  toggleParentCategory(parent: string) {
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

  areAllSubcategoriesSelected(parent: string): boolean {
    const subcategories = this.getSubcategories(parent);
    const selected = this.getSelectedSubcategories(parent);
    return subcategories.length > 0 && subcategories.every((sub) => selected.includes(sub));
  }

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
