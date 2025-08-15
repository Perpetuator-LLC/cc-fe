// Copyright (c) 2025 Perpetuator LLC
import { Component, ViewChild, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToolbarService } from '../toolbar.service';
import { SharedFooterComponent } from '../shared-footer/shared-footer.component';
import { ThemeService, Theme } from '../theme.service';
import { MatDialog } from '@angular/material/dialog';
import { MatListItem, MatNavList } from '@angular/material/list';

@Component({
  selector: 'app-pre-login-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatTooltip,
    MatIconModule,
    MatButtonModule,
    SharedFooterComponent,
    MatListItem,
    MatNavList,
  ],
  templateUrl: './pre-login-layout.component.html',
  styleUrls: ['./pre-login-layout.component.scss'],
})
export class PreLoginLayoutComponent implements OnInit, OnDestroy {
  protected currentTheme = this.themeService.theme;
  @ViewChild('toolbarContainer', { read: ViewContainerRef, static: true }) toolbarContainer!: ViewContainerRef;

  constructor(
    private themeService: ThemeService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.toolbarService.setRootViewContainerRef(this.toolbarContainer);
    this.currentTheme = this.themeService.theme;
  }

  ngOnDestroy() {
    this.toolbarService.clearToolbarComponent();
  }

  switchTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.themeService.setTheme(theme);
  }

  // openTermsModal(event: Event) {
  //   event.preventDefault();
  //   this.dialog.open(TermsAndConditionsModalComponent, {
  //     width: '80vw',
  //     maxWidth: '900px',
  //     panelClass: 'privacy-policy-modal',
  //   });
  // }
  //
  // openPrivacyModal(event: Event) {
  //   event.preventDefault();
  //   this.dialog.open(PrivacyPolicyModalComponent, {
  //     width: '80vw',
  //     maxWidth: '900px',
  //     panelClass: 'privacy-policy-modal',
  //   });
  // }
}
