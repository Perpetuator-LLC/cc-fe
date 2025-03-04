// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { Message, MessageService } from '../message.service';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent } from '@angular/material/card';
import { NgClass } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatRow, MatTextColumn } from '@angular/material/table';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [MatIcon, MatCard, MatCardContent, NgClass, MatIconButton, MatRow, MatTextColumn],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
})
export class MessageComponent {
  messages: Message[] = [];

  constructor(private messageService: MessageService) {
    this.messageService.messages$.subscribe({
      next: (messages) => {
        this.messages = messages;
        this.setAutoDismiss(messages);
      },
      error: (error) => {
        console.error(`Failed to load messages: ${error.message}`);
      },
    });
  }

  setAutoDismiss(messages: Message[]): void {
    messages.forEach((message) => {
      if (message.timeout) {
        setTimeout(() => {
          this.removeMessage(message.timestamp);
        }, message.timeout);
      }
    });
  }

  removeMessage(timeout: number) {
    this.messageService.removeMessage(timeout);
  }
}
