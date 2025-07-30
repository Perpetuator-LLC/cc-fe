// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink, MatCard, MatCardTitle, MatCardSubtitle, MatCardContent, MatDivider],
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss'],
})
export class PrivacyPolicyComponent {
  protected readonly Date = Date;
}
