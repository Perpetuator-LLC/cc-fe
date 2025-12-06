// Copyright (c) 2025 Perpetuator LLC
// Example component showing trace integration usage

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TraceService } from '../services/trace.service';

@Component({
  selector: 'app-trace-example',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  templateUrl: './trace-example.component.html',
  styleUrl: './trace-example.component.scss',
})
export class TraceExampleComponent implements OnInit {
  email = '';
  message = '';

  constructor(private traceService: TraceService) {}

  ngOnInit(): void {
    // Example: Track page views
    this.traceService
      .trackUserAction('page_view', {
        page_name: 'TraceExample',
        timestamp: new Date().toISOString(),
      })
      .subscribe();
  }

  onSubmit(): void {
    // Example: Track form submission
    this.traceService
      .trackUserAction('form_submit', {
        form_name: 'contact_form',
        has_email: !!this.email,
        has_message: !!this.message,
      })
      .subscribe();

    // Validate form
    const errors: Record<string, string> = {};

    if (!this.email) {
      errors['email'] = 'Email is required';
    } else if (!this.isValidEmail(this.email)) {
      errors['email'] = 'Invalid email format';
    }

    if (!this.message) {
      errors['message'] = 'Message is required';
    }

    if (Object.keys(errors).length > 0) {
      // Track validation errors
      this.traceService.trackValidationError('contact_form', errors).subscribe();
      return;
    }

    // Process form...
    this.processForm();
  }

  private processForm(): void {
    try {
      // Simulate form processing
      if (Math.random() < 0.1) {
        throw new Error('Random error for testing');
      }

      // Success
      console.log('Form submitted successfully');
    } catch (error) {
      // Track custom error
      if (error instanceof Error) {
        this.traceService
          .trackError(error, {
            moduleName: 'TraceExampleComponent',
            functionName: 'processForm',
            inputs: {
              email: this.email,
              messageLength: this.message.length,
            },
            tags: {
              form_type: 'contact',
              error_source: 'form_processing',
            },
          })
          .subscribe();
      }
    }
  }

  onButtonClick(buttonId: string): void {
    // Example: Track button clicks
    this.traceService
      .trackUserAction('button_click', {
        button_id: buttonId,
        page: 'TraceExample',
      })
      .subscribe();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
