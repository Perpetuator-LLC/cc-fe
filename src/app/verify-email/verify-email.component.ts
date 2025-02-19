// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageService } from '../message.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  verificationStatus = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.verifyEmail(token);
    } else {
      this.verificationStatus = 'Invalid verification link.';
    }
  }

  verifyEmail(key: string): void {
    const url = environment.API_URL + '/auth/registration/verify-email/';
    this.http.post(url, { key }).subscribe({
      next: (response) => {
        console.debug('Email verification response:', response);
        this.verificationStatus = 'Email verified successfully!';
        this.messageService.addMessage({
          type: 'success',
          text: 'Email verified successfully!',
          dismissible: true,
        });
        this.router.navigate(['/login'], {
          state: { messages: ['Email verified successfully!'] },
        });
      },
      error: (error) => {
        console.debug('Email verification error:', error);
        this.verificationStatus = 'Email verification failed. Please try again.';
      },
    });
  }
}
