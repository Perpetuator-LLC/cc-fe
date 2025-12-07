// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransactionsListComponent } from './transactions-list.component';
import { provideMockApollo, provideMockOAuthService, provideMockToolbarService } from '../../testing/test-providers';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('JobsListComponent', () => {
  let component: TransactionsListComponent;
  let fixture: ComponentFixture<TransactionsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideMockApollo(), provideMockOAuthService(), provideMockToolbarService()],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
