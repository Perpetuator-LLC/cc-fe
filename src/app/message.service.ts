import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Message extends NewMessage {
  timestamp: number;
}

export interface NewMessage {
  type: 'error' | 'warning' | 'info' | 'success';
  text: string;
  dismissible?: boolean;
  timeout?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  messages$ = this.messagesSubject.asObservable();

  error(text: string, timeout = undefined, dismissible = true) {
    this.addMessage({ type: 'error', text, dismissible, timeout });
  }

  warning(text: string, timeout = 8000, dismissible = true) {
    this.addMessage({ type: 'warning', text, dismissible, timeout });
  }

  info(text: string, timeout = 5000, dismissible = false) {
    this.addMessage({ type: 'info', text, dismissible, timeout });
  }

  success(text: string, timeout = 3000, dismissible = false) {
    this.addMessage({ type: 'success', text, dismissible, timeout });
  }

  addMessage(message: NewMessage) {
    const currentMessages = this.messagesSubject.value;
    let timestamp = Date.now(); // make sure it is unique else add 1ms
    while (currentMessages.some((m) => m.timestamp === timestamp)) {
      timestamp += 1;
    }
    const internalMessage: Message = { ...message, timestamp };
    this.messagesSubject.next([...currentMessages, internalMessage]);
  }

  removeMessage(timestamp: number) {
    const currentMessages = this.messagesSubject.value;
    const index = currentMessages.findIndex((message) => message.timestamp === timestamp);
    if (index === -1) {
      return; // message not found
    }
    currentMessages.splice(index, 1);
    this.messagesSubject.next([...currentMessages]);
  }

  clearMessages() {
    this.messagesSubject.next([]);
  }

  get messageCount(): number {
    return this.messagesSubject.value.length;
  }
}
