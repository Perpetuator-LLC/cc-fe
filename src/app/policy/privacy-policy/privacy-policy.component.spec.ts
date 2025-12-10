// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { ToolbarService } from '../../layout/toolbar.service';
import { AuthService } from '../../auth/auth.service';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';

describe('PrivacyPolicyComponent', () => {
  let component: PrivacyPolicyComponent;
  let fixture: ComponentFixture<PrivacyPolicyComponent>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['setToolbarTemplate', 'clearToolbarComponent']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['isLoggedIn']);

    mockAuthService.isLoggedIn.and.returnValue(false);

    const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));

    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyComponent, HttpClientTestingModule],
      providers: [
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Apollo, useValue: mockApollo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
