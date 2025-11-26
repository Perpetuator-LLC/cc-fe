// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { GraphqlAuthService } from '../graphql-auth.service';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;

  beforeEach(async () => {
    const mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: (key: string) => {
            if (key === 'uid') {
              return 'mock-uid';
            } else if (key === 'token') {
              return 'mock-token';
            } else {
              return null;
            }
          },
        },
      },
    };

    const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate']);
    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
    mockApollo.mutate.and.returnValue(of({ data: {} }));

    const mockGraphqlAuthService = jasmine.createSpyObj('GraphqlAuthService', ['resetPassword']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Apollo, useValue: mockApollo },
        { provide: GraphqlAuthService, useValue: mockGraphqlAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
