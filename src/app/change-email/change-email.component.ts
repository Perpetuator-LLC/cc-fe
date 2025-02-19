// Copyright (c) 2025 Perpetuator LLC
import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { ToolbarService } from '../toolbar.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [MessageComponent, MatCard, MatCardHeader, MatCardContent, MatCardTitle],
  templateUrl: './change-email.component.html',
  styleUrl: './change-email.component.scss',
})
export class ChangeEmailComponent implements AfterViewInit, OnInit {
  changeStatus = '';
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
  ) {}

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
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
    const url = environment.API_URL + '/change-email/';

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
