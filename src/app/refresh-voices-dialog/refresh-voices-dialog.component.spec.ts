// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefreshVoicesDialogComponent } from './refresh-voices-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { VoicesService } from '../voices.service';
import { MessageService } from '../message.service';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('RefreshVoicesDialogComponent', () => {
  let component: RefreshVoicesDialogComponent;
  let fixture: ComponentFixture<RefreshVoicesDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<RefreshVoicesDialogComponent>>;
  let mockVoicesService: jasmine.SpyObj<VoicesService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockVoicesService = jasmine.createSpyObj('VoicesService', ['refreshVoices']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [RefreshVoicesDialogComponent],
      providers: [
        provideAnimations(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: VoicesService, useValue: mockVoicesService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RefreshVoicesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
