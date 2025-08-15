// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { TermsAndConditionsModalComponent } from '../terms-and-conditions-modal.component';
import { PrivacyPolicyModalComponent } from '../privacy-policy-modal.component';
import { MessageComponent } from '../message/message.component';

@Component({
  selector: 'app-shared-footer',
  standalone: true,
  imports: [MatToolbarModule, MessageComponent],
  templateUrl: './shared-footer.component.html',
  styleUrls: ['./shared-footer.component.scss'],
})
export class SharedFooterComponent {
  // @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private dialog: MatDialog,
    // private toolbarService: ToolbarService,
  ) {}

  // ngAfterViewInit() {
  //   const viewContainerRef = this.toolbarService.getViewContainerRef();
  //   viewContainerRef.clear();
  //   viewContainerRef.createEmbeddedView(this.toolbarTemplate);
  // }

  openTermsModal(event: Event) {
    event.preventDefault();
    this.dialog.open(TermsAndConditionsModalComponent, {
      width: '80vw',
      maxWidth: '900px',
      panelClass: 'privacy-policy-modal',
    });
  }

  openPrivacyModal(event: Event) {
    event.preventDefault();
    this.dialog.open(PrivacyPolicyModalComponent, {
      width: '80vw',
      maxWidth: '900px',
      panelClass: 'privacy-policy-modal',
    });
  }
}
