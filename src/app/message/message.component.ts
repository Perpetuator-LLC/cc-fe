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
    this.messageService.messages$.subscribe((messages) => {
      this.messages = messages;
    });
  }

  removeMessage(index: number) {
    this.messageService.removeMessage(index);
  }
}
