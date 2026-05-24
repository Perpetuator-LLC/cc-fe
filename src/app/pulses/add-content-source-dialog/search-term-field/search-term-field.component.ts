// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-search-term-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './search-term-field.component.html',
  styleUrl: './search-term-field.component.scss',
})
export class SearchTermFieldComponent {
  @Input({ required: true }) form!: FormGroup;

  get hasRequiredError(): boolean {
    return !!this.form.get('searchTerm')?.hasError('required');
  }

  get hasMinLengthError(): boolean {
    return !!this.form.get('searchTerm')?.hasError('minlength');
  }
}
