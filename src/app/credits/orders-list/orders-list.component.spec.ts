// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersListComponent } from './orders-list.component';
import {
  provideMockApollo,
  provideMockOAuthService,
  provideMockActivatedRoute,
  provideMockToolbarService,
} from '../../testing/test-providers';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserService } from '../../user/user.service';

describe('OrdersListComponent', () => {
  let component: OrdersListComponent;
  let fixture: ComponentFixture<OrdersListComponent>;

  beforeEach(async () => {
    const mockUserService = jasmine.createSpyObj('UserService', ['loadUserDetails']);
    mockUserService.loadUserDetails.and.stub();
    mockUserService.userDetails = jasmine.createSpy('userDetails').and.returnValue({});

    await TestBed.configureTestingModule({
      imports: [OrdersListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideMockApollo(),
        provideMockOAuthService(),
        provideMockActivatedRoute(),
        provideMockToolbarService(),
        { provide: UserService, useValue: mockUserService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
