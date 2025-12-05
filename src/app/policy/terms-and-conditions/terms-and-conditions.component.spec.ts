// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TermsAndConditionsComponent } from './terms-and-conditions.component';
import { ToolbarService } from '../../toolbar.service';
import { PolicyService } from '../services/policy.service';
import { of } from 'rxjs';

describe('TermsAndConditionsComponent', () => {
  let component: TermsAndConditionsComponent;
  let fixture: ComponentFixture<TermsAndConditionsComponent>;

  beforeEach(async () => {
    const mockToolbarService = {
      getViewContainerRef: jasmine.createSpy('getViewContainerRef').and.returnValue({
        clear: jasmine.createSpy('clear'),
        createEmbeddedView: jasmine.createSpy('createEmbeddedView'),
      }),
    };

    const mockPolicyService = jasmine.createSpyObj('PolicyService', ['getLatestPolicy']);
    mockPolicyService.getLatestPolicy.and.returnValue(of({ content: '', version: '1.0' }));

    await TestBed.configureTestingModule({
      imports: [TermsAndConditionsComponent, HttpClientTestingModule],
      providers: [
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: PolicyService, useValue: mockPolicyService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsAndConditionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
