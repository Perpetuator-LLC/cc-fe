// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectorRef, Component, inject, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Messages enriched with pre-computed boolean flags for the template. */
  messages: (MessageWithProgress & { hasHtmlContent: boolean; showTimeoutProgress: boolean })[] = [];
  private timeoutIds = new Map<number, number>();
  private progressIntervalIds = new Map<number, number>();
  // Store timeout progress and start times separately so they persist through array updates
  private timeoutProgressMap = new Map<number, number>();
  private timeoutStartTimeMap = new Map<number, number>();

  constructor() {
    this.messageService.messages$.subscribe({
      next: (messages) => {
        this.messages = messages.map((message) => {
          const existingProgress = this.timeoutProgressMap.get(message.timestamp);
          const existingStartTime = this.timeoutStartTimeMap.get(message.timestamp);

          if (existingProgress !== undefined) {
            // Message already has a timer running - use stored values
            return {
              ...message,
              timeoutProgress: existingProgress,
              timeoutStartTime: existingStartTime,
              hasHtmlContent: this.hasHtmlContent(message),
              showTimeoutProgress: this.shouldShowTimeoutProgress(message),
            };
          }

          // New message - initialize and start timer
          const newMessage: MessageWithProgress = {
            ...message,
            timeoutProgress: 100,
            timeoutStartTime: Date.now(),
          };
          this.timeoutProgressMap.set(message.timestamp, 100);
          this.timeoutStartTimeMap.set(message.timestamp, newMessage.timeoutStartTime!);
          this.setAutoDismiss(newMessage);
          return {
            ...newMessage,
            hasHtmlContent: this.hasHtmlContent(newMessage),
            showTimeoutProgress: this.shouldShowTimeoutProgress(newMessage),
          };
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

      const startTime = this.timeoutStartTimeMap.get(message.timestamp) || Date.now();
      const timeout = message.timeout;
      const timestamp = message.timestamp;

      // Run interval outside Angular zone to avoid triggering change detection every 50ms
      this.ngZone.runOutsideAngular(() => {
        const intervalId = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, timeout - elapsed);
          const progress = (remaining / timeout) * 100;

          // Update the Map so the value persists
          this.timeoutProgressMap.set(timestamp, progress);

          // Also update the message in the array for reactivity
          const msg = this.messages.find((m) => m.timestamp === timestamp);
          if (msg) {
            msg.timeoutProgress = progress;
          }

          // Trigger change detection to update the UI
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });

          if (progress <= 0) {
            this.clearMessageTimers(timestamp);
          }
        }, 50);
        this.progressIntervalIds.set(timestamp, intervalId);
      });
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

    // Clean up progress tracking maps
    this.timeoutProgressMap.delete(timestamp);
    this.timeoutStartTimeMap.delete(timestamp);
  }

  shouldShowTimeoutProgress(message: MessageWithProgress): boolean {
    return message.type !== 'progress' && message.timeout !== null && message.timeout !== undefined;
  }

  /**
   * Check if message contains HTML content (links, etc.)
   * Used to determine if close button should be shown
   */
  hasHtmlContent(message: Message): boolean {
    return message.text.includes('<a ') || message.text.includes('<button');
  }

  /**
   * Intercept link clicks in message content to use Angular Router for internal links
   * Also dismisses the toast after clicking a link
   */
  handleLinkClick(event: Event, message: MessageWithProgress): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');

    if (anchor) {
      const href = anchor.getAttribute('href');
      // Check if it's an internal link (starts with /)
      if (href && href.startsWith('/')) {
        event.preventDefault();
        // Dismiss the toast first, then navigate
        this.removeMessage(message.timestamp);
        this.router.navigateByUrl(href);
      } else if (href) {
        // External link - still dismiss the toast
        this.removeMessage(message.timestamp);
      }
    }
  }

  ngOnDestroy(): void {
    this.timeoutIds.forEach((id) => clearTimeout(id));
    this.progressIntervalIds.forEach((id) => clearInterval(id));
    this.timeoutIds.clear();
    this.progressIntervalIds.clear();
    this.timeoutProgressMap.clear();
    this.timeoutStartTimeMap.clear();
  }
}
