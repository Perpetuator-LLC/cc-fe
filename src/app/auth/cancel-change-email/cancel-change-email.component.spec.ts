// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CancelChangeEmailComponent } from './cancel-change-email.component';
import { ToolbarService } from '../../layout/toolbar.service';

describe('VerifyEmailComponent', () => {
  let component: CancelChangeEmailComponent;
  let fixture: ComponentFixture<CancelChangeEmailComponent>;

  beforeEach(async () => {
    const mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => (key === 'token' ? 'mock-token-string' : null),
        },
      },
    };

    const mockToolbarService = {
      setToolbarTemplate: jasmine.createSpy('setToolbarTemplate'),
      clearToolbarComponent: jasmine.createSpy('clearToolbarComponent'),
    };

    await TestBed.configureTestingModule({
      imports: [CancelChangeEmailComponent, HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToolbarService, useValue: mockToolbarService },
        FormBuilder,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CancelChangeEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
