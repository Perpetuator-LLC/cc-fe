import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelChangeEmailComponent } from './cancel-change-email.component';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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

    await TestBed.configureTestingModule({
      imports: [CancelChangeEmailComponent, HttpClientTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: mockActivatedRoute }, FormBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(CancelChangeEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
