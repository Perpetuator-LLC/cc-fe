// Copyright (c) 2025-2026 Perpetuator LLC
import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from '../../core/app-config.service';
import { MessageService } from '../../message.service';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { ToolbarService } from '../../layout/toolbar.service';

@Component({
  selector: 'app-cancel-verify-email',
  standalone: true,
  imports: [MatCard, MatCardHeader, MatCardContent, MatCardTitle],
  templateUrl: './cancel-change-email.component.html',
  styleUrl: './cancel-change-email.component.scss',
})
export class CancelChangeEmailComponent implements AfterViewInit, OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);
  private toolbarService = inject(ToolbarService);
  private messageService = inject(MessageService);
  private appConfig = inject(AppConfigService);

  changeStatus = '';
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  ngAfterViewInit() {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.cancelChangeEmail(token);
    } else {
      this.changeStatus = 'Invalid cancellation link.';
    }
  }

  cancelChangeEmail(token: string): void {
    const url = this.appConfig.config.API_URL + '/cancel-change-email/';

    this.http.post(url, { token }).subscribe({
      next: (response) => {
        console.debug('Cancel email change response:', response);
        this.changeStatus = 'Canceled email changed successfully!';
        this.messageService.success('Canceled email change successfully!');
        this.router.navigate(['/profile'], {
          state: { messages: ['Canceled email change successfully!'] },
        });
      },
      error: (data) => {
        console.debug('Cancel email change error:', data);
        this.changeStatus = `Cancel email change failed: ${data.error.error}`;
        this.messageService.error(`Cancel email change failed: ${data.error.error}`);
        this.router.navigate(['/profile'], {
          state: { messages: [`Cancel email change failed: ${data.error.error}`] },
        });
      },
    });
  }
}
