// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodcastCategoriesComponent } from './podcast-categories.component';

describe('PodcastCategoriesComponent', () => {
  let component: PodcastCategoriesComponent;
  let fixture: ComponentFixture<PodcastCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastCategoriesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PodcastCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
