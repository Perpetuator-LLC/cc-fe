// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy } from '@angular/core';
import { Message, MessageService } from '../message.service';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent } from '@angular/material/card';
import { NgClass } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';

interface MessageWithProgress extends Message {
  timeoutProgress?: number;
  timeoutStartTime?: number;
}

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [MatIcon, MatCard, MatCardContent, NgClass, MatIconButton, MatProgressBar],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
})
export class MessageComponent implements OnDestroy {
  messages: MessageWithProgress[] = [];
  private timeoutIds = new Map<number, number>();
  private progressIntervalIds = new Map<number, number>();

  constructor(private messageService: MessageService) {
    this.messageService.messages$.subscribe({
      next: (messages) => {
        this.messages = messages.map((message) => {
          const existingMessage = this.messages.find((m) => m.timestamp === message.timestamp);
          if (existingMessage) {
            // Merge updated message data with existing timeout tracking data
            return {
              ...message, // Use updated message data (text, progress, etc.)
              timeoutProgress: existingMessage.timeoutProgress,
              timeoutStartTime: existingMessage.timeoutStartTime,
            };
          }
          const newMessage: MessageWithProgress = {
            ...message,
            timeoutProgress: 100,
            timeoutStartTime: Date.now(),
          };
          this.setAutoDismiss(newMessage);
          return newMessage;
        });
      },
      error: (error) => {
        console.error(`Failed to load messages: ${error.message}`);
      },
    });
  }

  setAutoDismiss(message: MessageWithProgress): void {
    if (message.timeout) {
      const timeoutId = window.setTimeout(() => {
        this.removeMessage(message.timestamp);
      }, message.timeout);
      this.timeoutIds.set(message.timestamp, timeoutId);

      const intervalId = window.setInterval(() => {
        const elapsed = Date.now() - (message.timeoutStartTime || Date.now());
        const remaining = Math.max(0, (message.timeout || 0) - elapsed);
        message.timeoutProgress = (remaining / (message.timeout || 1)) * 100;

        if (message.timeoutProgress <= 0) {
          this.clearMessageTimers(message.timestamp);
        }
      }, 50);
      this.progressIntervalIds.set(message.timestamp, intervalId);
    }
  }

  removeMessage(timestamp: number) {
    this.clearMessageTimers(timestamp);
    this.messageService.removeMessage(timestamp);
  }

  clearMessageTimers(timestamp: number): void {
    const timeoutId = this.timeoutIds.get(timestamp);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutIds.delete(timestamp);
    }

    const intervalId = this.progressIntervalIds.get(timestamp);
    if (intervalId) {
      clearInterval(intervalId);
      this.progressIntervalIds.delete(timestamp);
    }
  }

  shouldShowTimeoutProgress(message: MessageWithProgress): boolean {
    return message.type !== 'progress' && message.timeout !== null && message.timeout !== undefined;
  }

  ngOnDestroy(): void {
    this.timeoutIds.forEach((id) => clearTimeout(id));
    this.progressIntervalIds.forEach((id) => clearInterval(id));
    this.timeoutIds.clear();
    this.progressIntervalIds.clear();
  }
}
