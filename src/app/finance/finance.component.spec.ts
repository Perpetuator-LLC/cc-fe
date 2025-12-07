// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinanceComponent } from './finance.component';
import { provideMockActivatedRoute, provideMockToolbarService } from '../testing/test-providers';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('FinanceComponent', () => {
  let component: FinanceComponent;
  let fixture: ComponentFixture<FinanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceComponent, NoopAnimationsModule],
      providers: [provideMockActivatedRoute(), provideMockToolbarService()],
    }).compileComponents();

    fixture = TestBed.createComponent(FinanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
