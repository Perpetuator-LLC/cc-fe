// Copyright (c) 2025 Perpetuator LLC
import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

/**
 * MD3 Button Variants as defined by Material Design 3
 * @see https://m3.material.io/components/buttons/specs
 */
interface ButtonVariant {
  id: string;
  name: string;
  description: string;
  directive: string; // Angular Material directive
  iconOnly?: boolean;
}

/**
 * Color roles available for buttons
 */
interface ColorRole {
  id: string;
  name: string;
  cssClass: string;
  description: string;
}

/**
 * Button states
 */
interface ButtonState {
  id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-button-showcase',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './button-showcase.component.html',
  styleUrls: ['./button-showcase.component.scss'],
})
export class ButtonShowcaseComponent implements AfterViewInit {
  /**
   * MD3 Button Variants
   * These map to Angular Material button directives
   */
  variants: ButtonVariant[] = [
    {
      id: 'filled',
      name: 'Filled',
      description: 'High emphasis, for primary actions',
      directive: 'mat-flat-button',
    },
    {
      id: 'tonal',
      name: 'Tonal (Filled Tonal)',
      description: 'Medium-high emphasis, alternative to filled',
      directive: 'mat-flat-button', // Uses tonal class
    },
    {
      id: 'outlined',
      name: 'Outlined',
      description: 'Medium emphasis, for secondary actions',
      directive: 'mat-stroked-button',
    },
    {
      id: 'text',
      name: 'Text',
      description: 'Low emphasis, for less prominent actions',
      directive: 'mat-button',
    },
    {
      id: 'elevated',
      name: 'Elevated',
      description: 'Medium emphasis with shadow, for actions needing visual lift',
      directive: 'mat-raised-button',
    },
    {
      id: 'icon',
      name: 'Icon',
      description: 'Icon-only buttons for compact actions',
      directive: 'mat-icon-button',
      iconOnly: true,
    },
    {
      id: 'fab',
      name: 'FAB',
      description: 'Floating Action Button for primary screen action',
      directive: 'mat-fab',
      iconOnly: true,
    },
    {
      id: 'mini-fab',
      name: 'Mini FAB',
      description: 'Smaller FAB for secondary actions',
      directive: 'mat-mini-fab',
      iconOnly: true,
    },
    {
      id: 'extended-fab',
      name: 'Extended FAB',
      description: 'FAB with icon and text label',
      directive: 'mat-fab',
    },
  ];

  /**
   * Color roles - maps to our btn-* CSS classes
   */
  colorRoles: ColorRole[] = [
    {
      id: 'primary',
      name: 'Primary',
      cssClass: 'btn-primary',
      description: 'Brand color (blue), for main actions',
    },
    {
      id: 'secondary',
      name: 'Secondary',
      cssClass: 'btn-secondary',
      description: 'CTA color (orange), for call-to-action',
    },
    {
      id: 'tertiary',
      name: 'Tertiary',
      cssClass: 'btn-tertiary',
      description: 'AI/Premium color (purple), for special features',
    },
    {
      id: 'surface',
      name: 'Surface/Default',
      cssClass: 'btn-surface',
      description: 'Neutral color, for low-emphasis actions',
    },
    {
      id: 'success',
      name: 'Success',
      cssClass: 'btn-success',
      description: 'Success semantic color (green)',
    },
    {
      id: 'warning',
      name: 'Warning',
      cssClass: 'btn-warning',
      description: 'Warning semantic color (amber)',
    },
    {
      id: 'error',
      name: 'Error',
      cssClass: 'btn-error',
      description: 'Error semantic color (red)',
    },
    {
      id: 'info',
      name: 'Info',
      cssClass: 'btn-info',
      description: 'Info semantic color (blue)',
    },
  ];

  /**
   * Button states
   */
  states: ButtonState[] = [
    { id: 'enabled', name: 'Enabled', description: 'Default interactive state' },
    { id: 'disabled', name: 'Disabled', description: 'Non-interactive state' },
    { id: 'hovered', name: 'Hovered', description: 'Mouse over state (hover to see)' },
    { id: 'focused', name: 'Focused', description: 'Keyboard focus state (tab to see)' },
  ];

  // Filter selections
  selectedVariant = 'all';
  selectedColor = 'all';
  selectedState = 'enabled';

  // Toggle state for demo
  toggleStates: Record<string, boolean> = {};

  ngAfterViewInit(): void {
    // Log some debug info
    setTimeout(() => {
      console.log('[ButtonShowcase] Component initialized');
      console.log('Variants:', this.variants.length);
      console.log('Colors:', this.colorRoles.length);
    }, 100);
  }

  /**
   * Get CSS class for a variant + color combination
   */
  getButtonClass(variant: ButtonVariant, color: ColorRole): string {
    // Base class for the color
    let cssClass = color.cssClass;

    // Add variant-specific suffix for tonal/outlined/text
    if (variant.id === 'tonal') {
      cssClass = `${color.cssClass}-tonal`;
    } else if (variant.id === 'outlined') {
      cssClass = `${color.cssClass}-outlined`;
    } else if (variant.id === 'text') {
      cssClass = `${color.cssClass}-text`;
    }

    return cssClass;
  }

  /**
   * Check if a variant should be shown based on filter
   */
  shouldShowVariant(variant: ButtonVariant): boolean {
    return this.selectedVariant === 'all' || this.selectedVariant === variant.id;
  }

  /**
   * Check if a color should be shown based on filter
   */
  shouldShowColor(color: ColorRole): boolean {
    return this.selectedColor === 'all' || this.selectedColor === color.id;
  }

  /**
   * Toggle a button's active state
   */
  toggleButton(key: string): void {
    this.toggleStates[key] = !this.toggleStates[key];
  }

  /**
   * Check if button is toggled
   */
  isToggled(key: string): boolean {
    return this.toggleStates[key] || false;
  }

  /**
   * Inspect button styles (for debugging)
   */
  inspectButton(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const styles = window.getComputedStyle(button);

    console.log('=== Button Inspection ===');
    console.log('Element:', button);
    console.log('Classes:', button.className);
    console.log('Styles:', {
      borderRadius: styles.borderRadius,
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      border: styles.border,
      boxShadow: styles.boxShadow,
    });
  }

  /**
   * Get the visible colors based on filter
   */
  get visibleColors(): ColorRole[] {
    return this.colorRoles.filter((c) => this.shouldShowColor(c));
  }

  /**
   * Get the visible variants based on filter
   */
  get visibleVariants(): ButtonVariant[] {
    return this.variants.filter((v) => this.shouldShowVariant(v));
  }
}
