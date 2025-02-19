// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { MatCard, MatCardContent, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-eula',
  standalone: true,
  imports: [MatCard, MatDivider, MatCardSubtitle, MatCardTitle, MatCardContent],
  templateUrl: './terms-and-conditions.component.html',
  styleUrl: './terms-and-conditions.component.scss',
})
export class TermsAndConditionsComponent {}
