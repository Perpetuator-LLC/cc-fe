// Copyright (c) 2025 Perpetuator LLC
import { Component, AfterViewInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardContent, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-eula',
  standalone: true,
  imports: [MatCard, MatDivider, MatCardSubtitle, MatCardTitle, MatCardContent],
  templateUrl: './terms-and-conditions.component.html',
  styleUrl: './terms-and-conditions.component.scss',
})
export class TermsAndConditionsComponent implements AfterViewInit {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private toolbarService: ToolbarService,
    protected authService: AuthService,
  ) {}

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
  }
}
