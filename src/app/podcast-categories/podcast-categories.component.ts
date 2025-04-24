// Copyright (c) 2025 Perpetuator LLC

import { Component, OnInit, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PodcastsService } from '../podcasts.service';

@Component({
  selector: 'app-podcast-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  selectedParents: string[] = [];
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
      this.updateSelectedParents();
    });
  }

  writeValue(obj: Record<string, string[]>) {
    this.value = obj || {};
    this.updateSelectedParents();
  }

  registerOnChange(fn: (value: Record<string, string[]>) => void) {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  private updateModel() {
    this.onChange(this.value);
  }

  updateSelectedParents() {
    this.selectedParents = Object.keys(this.value);
  }

  isParentSelected(parent: string): boolean {
    return this.selectedParents.includes(parent);
  }

  isSubSelected(parent: string, sub: string): boolean {
    return this.value[parent]?.includes(sub) || false;
  }

  toggleParentCategory(parent: string) {
    const newValue = { ...this.value };
    if (this.isParentSelected(parent)) {
      delete newValue[parent];
    } else {
      newValue[parent] = [];
    }
    this.value = newValue;
    this.updateSelectedParents();
    this.updateModel();
  }

  toggleSubCategory(parent: string, sub: string) {
    const newValue = { ...this.value };
    if (!newValue[parent]) {
      newValue[parent] = [];
    }
    if (this.isSubSelected(parent, sub)) {
      newValue[parent] = newValue[parent].filter((s) => s !== sub);
    } else {
      newValue[parent] = [...newValue[parent], sub];
    }
    this.value = newValue;
    this.updateModel();
  }

  getSelectedSubs(parent: string): string[] {
    return this.value[parent] || [];
  }
}
