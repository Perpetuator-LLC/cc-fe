// Copyright (c) 2025-2026 Perpetuator LLC
import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from '../../core/app-config.service';
import { MessageService } from '../../message.service';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { ToolbarService } from '../../layout/toolbar.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [MatCard, MatCardHeader, MatCardContent, MatCardTitle],
  templateUrl: './change-email.component.html',
  styleUrl: './change-email.component.scss',
})
export class ChangeEmailComponent implements AfterViewInit, OnInit {
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
      this.changeEmail(token);
    } else {
      this.changeStatus = 'Invalid verification link.';
    }
  }

  changeEmail(token: string): void {
    const url = this.appConfig.config.API_URL + '/change-email/';

    this.http.post(url, { token }).subscribe({
      next: (response) => {
        console.debug('Email change response:', response);
        this.changeStatus = 'Email changed successfully!';
        this.messageService.addMessage({
          type: 'success',
          text: 'Email changed successfully!',
          dismissible: true,
        });
        this.router.navigate(['/profile'], {
          state: { messages: ['Email changed successfully!'] },
        });
      },
      error: (data) => {
        console.debug('Email change error:', data);
        this.changeStatus = `Email change failed: ${data.error.error}`;
        this.messageService.addMessage({
          type: 'error',
          text: `Email change failed: ${data.error.error}`,
          dismissible: true,
        });
        this.router.navigate(['/profile'], {
          state: { messages: [`Email change failed: ${data.error.error}`] },
        });
      },
    });
  }
}
