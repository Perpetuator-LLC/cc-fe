// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChangeEmailComponent } from './change-email.component';
import { ToolbarService } from '../toolbar.service';

describe('VerifyEmailComponent', () => {
  let component: ChangeEmailComponent;
  let fixture: ComponentFixture<ChangeEmailComponent>;

  beforeEach(async () => {
    const mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => (key === 'token' ? 'mock-token-string' : null),
        },
      },
    };

    const mockToolbarService = {
      getViewContainerRef: jasmine.createSpy('getViewContainerRef').and.returnValue({
        clear: jasmine.createSpy('clear'),
        createEmbeddedView: jasmine.createSpy('createEmbeddedView'),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ChangeEmailComponent, HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToolbarService, useValue: mockToolbarService },
        FormBuilder,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
