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
  selector: 'app-cancel-verify-email',
  standalone: true,
  imports: [MessageComponent, MatCard, MatCardHeader, MatCardContent, MatCardTitle],
  templateUrl: './cancel-change-email.component.html',
  styleUrl: './cancel-change-email.component.scss',
})
export class CancelChangeEmailComponent implements AfterViewInit, OnInit {
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
      this.cancelChangeEmail(token);
    } else {
      this.changeStatus = 'Invalid cancellation link.';
    }
  }

  cancelChangeEmail(token: string): void {
    const url = environment.API_URL + '/cancel-change-email/';

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
