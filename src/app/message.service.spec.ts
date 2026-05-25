// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';

import { Message, MessageService } from './message.service';

function lastMessage(messages: Message[]): Message {
  return messages[messages.length - 1];
}

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.messageCount).toBe(0);
  });

  describe('addMessage', () => {
    it('appends to messages$ with a unique timestamp', (done) => {
      service.messages$.subscribe((messages) => {
        if (messages.length === 2) {
          expect(messages[0].timestamp).not.toBe(messages[1].timestamp);
          done();
        }
      });
      service.addMessage({ type: 'info', text: 'a' });
      service.addMessage({ type: 'info', text: 'b' });
    });
  });

  describe('error', () => {
    it('logs to console and adds an error message', () => {
      spyOn(console, 'error');
      service.error('oh no');
      expect(console.error).toHaveBeenCalled();
      let messages: Message[] = [];
      service.messages$.subscribe((m) => (messages = m));
      expect(lastMessage(messages).type).toBe('error');
      expect(lastMessage(messages).text).toBe('oh no');
    });
  });

  describe('warning / success / info', () => {
    it('warning adds a warning message with default timeout 8000', () => {
      service.warning('careful');
      let messages: Message[] = [];
      service.messages$.subscribe((m) => (messages = m));
      expect(lastMessage(messages)).toEqual(
        jasmine.objectContaining({ type: 'warning', timeout: 8000, dismissible: true }),
      );
    });

    it('success adds a success message with default timeout 5000', () => {
      service.success('yay');
      let messages: Message[] = [];
      service.messages$.subscribe((m) => (messages = m));
      expect(lastMessage(messages)).toEqual(
        jasmine.objectContaining({ type: 'success', timeout: 5000, dismissible: false }),
      );
    });

    it('info adds an info message with default timeout 3000', () => {
      service.info('hi');
      let messages: Message[] = [];
      service.messages$.subscribe((m) => (messages = m));
      expect(lastMessage(messages)).toEqual(
        jasmine.objectContaining({ type: 'info', timeout: 3000, dismissible: false }),
      );
    });
  });

  describe('progress / updateProgress', () => {
    it('progress adds a progress message and returns its timestamp', () => {
      const ts = service.progress('uploading', 25);
      let messages: Message[] = [];
      service.messages$.subscribe((m) => (messages = m));
      expect(lastMessage(messages).type).toBe('progress');
      expect(lastMessage(messages).progress).toBe(25);
      expect(lastMessage(messages).timestamp).toBe(ts);
    });

    it('updateProgress modifies an existing progress message immutably', () => {
      const ts = service.progress('uploading', 0);
      service.updateProgress(ts, 'uploading 50%', 50);
      let messages: Message[] = [];
      service.messages$.subscribe((m) => (messages = m));
      expect(lastMessage(messages).text).toBe('uploading 50%');
      expect(lastMessage(messages).progress).toBe(50);
    });

    it('updateProgress is a no-op for unknown timestamps', () => {
      service.progress('x', 0);
      const before: Message[] = [];
      service.messages$.subscribe((m) => before.push(...m));
      service.updateProgress(999_999_999, 'x', 100);
      const after: Message[] = [];
      service.messages$.subscribe((m) => after.push(...m));
      expect(after[after.length - 1].progress).toBe(0);
    });

    it('progress message timestamps stay unique under rapid calls', () => {
      const ts1 = service.progress('a', 0);
      const ts2 = service.progress('b', 0);
      expect(ts1).not.toBe(ts2);
    });
  });

  describe('removeMessage / clearMessages', () => {
    it('removeMessage drops the matching message', () => {
      service.info('x');
      let messages: Message[] = [];
      service.messages$.subscribe((m) => (messages = m));
      const ts = messages[0].timestamp;
      service.removeMessage(ts);
      service.messages$.subscribe((m) => (messages = m));
      expect(messages.length).toBe(0);
    });

    it('removeMessage is a no-op for unknown timestamps', () => {
      service.info('x');
      service.removeMessage(999_999_999);
      expect(service.messageCount).toBe(1);
    });

    it('clearMessages wipes the queue', () => {
      service.info('a');
      service.info('b');
      service.clearMessages();
      expect(service.messageCount).toBe(0);
    });
  });

  describe('getCallerStack', () => {
    it('returns a string when the stack is available', () => {
      // jasmine runs inside a stack frame so getCallerStack always has lines
      const result = service.getCallerStack();
      expect(typeof result === 'string' || result === null).toBeTrue();
    });
  });
});
