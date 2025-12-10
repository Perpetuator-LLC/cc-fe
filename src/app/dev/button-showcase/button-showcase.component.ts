// Copyright (c) 2025 Perpetuator LLC
import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface ButtonClass {
  name: string;
  class: string;
}

interface ButtonType {
  name: string;
  directive: string;
}

@Component({
  selector: 'app-button-showcase',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './button-showcase.component.html',
  styleUrls: ['./button-showcase.component.scss'],
})
export class ButtonShowcaseComponent implements AfterViewInit {
  // Row headers - our custom button classes
  buttonClasses: ButtonClass[] = [
    { name: 'No class (default)', class: '' },
    { name: '.btn-primary', class: 'btn-primary' },
    { name: '.btn-primary-outlined', class: 'btn-primary-outlined' },
    { name: '.btn-primary-text', class: 'btn-primary-text' },
    { name: '.btn-primary-tonal', class: 'btn-primary-tonal' },
    { name: '.btn-secondary', class: 'btn-secondary' },
    { name: '.btn-secondary-outlined', class: 'btn-secondary-outlined' },
    { name: '.btn-secondary-text', class: 'btn-secondary-text' },
    { name: '.btn-secondary-tonal', class: 'btn-secondary-tonal' },
    { name: '.btn-tertiary', class: 'btn-tertiary' },
    { name: '.btn-tertiary-outlined', class: 'btn-tertiary-outlined' },
    { name: '.btn-tertiary-text', class: 'btn-tertiary-text' },
    { name: '.btn-tertiary-tonal', class: 'btn-tertiary-tonal' },
    { name: '.btn-surface', class: 'btn-surface' },
    { name: '.btn-surface-outlined', class: 'btn-surface-outlined' },
  ];

  // Column headers - Material button directives
  buttonTypes: ButtonType[] = [
    { name: 'mat-button', directive: 'mat-button' },
    { name: 'mat-flat-button', directive: 'mat-flat-button' },
    { name: 'mat-raised-button', directive: 'mat-raised-button' },
    { name: 'mat-stroked-button', directive: 'mat-stroked-button' },
    { name: 'mat-fab', directive: 'mat-fab' },
    { name: 'mat-mini-fab', directive: 'mat-mini-fab' },
    { name: 'mat-icon-button', directive: 'mat-icon-button' },
  ];

  ngAfterViewInit(): void {
    // Log button class info after view is initialized
    setTimeout(() => {
      const sampleBtn = document.querySelector('button.btn-secondary');
      if (sampleBtn) {
        console.log('[ButtonShowcase] Sample .btn-secondary button:');
        console.log('  All classes:', sampleBtn.className);
        console.log('  Has mat-mdc-button-base:', sampleBtn.classList.contains('mat-mdc-button-base'));
        const styles = getComputedStyle(sampleBtn);
        console.log('  Computed background:', styles.backgroundColor);
        console.log('  Computed color:', styles.color);
      }
    }, 500);
  }

  // Helper to get computed styles for debugging
  inspectButton(event: Event): void {
    const button = event.target as HTMLElement;
    const styles = window.getComputedStyle(button);
    console.log('=== Button Inspection ===');
    console.log('Element:', button);
    console.log('All classes:', button.className);
    console.log('Has mat-mdc-button-base:', button.classList.contains('mat-mdc-button-base'));
    console.log('borderRadius:', styles.borderRadius);
    console.log('backgroundColor:', styles.backgroundColor);
    console.log('color:', styles.color);
    console.log('border:', styles.border);

    // Check for MDC CSS variables
    console.log('MDC Variables on element:');
    console.log(
      '  --mdc-filled-button-container-color:',
      styles.getPropertyValue('--mdc-filled-button-container-color'),
    );
    console.log(
      '  --mdc-filled-button-label-text-color:',
      styles.getPropertyValue('--mdc-filled-button-label-text-color'),
    );
  }
}
