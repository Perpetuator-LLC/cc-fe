// Copyright (c) 2025 Perpetuator LLC
import { Component, AfterViewInit, TemplateRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink, MatCard, MatCardTitle, MatCardSubtitle, MatCardContent, MatDivider],
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss'],
})
export class PrivacyPolicyComponent implements AfterViewInit {
  protected readonly Date = Date;
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
