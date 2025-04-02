// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PodcastsListComponent } from './podcasts-list.component';

describe('TeamsListComponentComponent', () => {
  let component: PodcastsListComponent;
  let fixture: ComponentFixture<PodcastsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PodcastsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
