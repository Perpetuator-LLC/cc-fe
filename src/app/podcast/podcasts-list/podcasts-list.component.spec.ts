// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PodcastsListComponent } from './podcasts-list.component';
import {
  provideMockApollo,
  provideMockOAuthService,
  provideMockActivatedRoute,
  provideMockToolbarService,
} from '../../testing/test-providers';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TeamsListComponentComponent', () => {
  let component: PodcastsListComponent;
  let fixture: ComponentFixture<PodcastsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PodcastsListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideMockApollo(),
        provideMockOAuthService(),
        provideMockActivatedRoute({ teamId: '123' }),
        provideMockToolbarService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PodcastsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('sorting', () => {
    it('defaults a new field to descending and toggles on repeat', () => {
      component.onSortChange('name');
      expect(component.getSortDirection('name')).toBe('desc');
      component.onSortChange('name');
      expect(component.getSortDirection('name')).toBe('asc');
      component.onSortChange('name');
      expect(component.getSortDirection('name')).toBe('desc');
      component.onSortChange('created_at');
      expect(component.getSortDirection('created_at')).toBe('desc');
      expect(component.getSortDirection('name')).toBeNull();
    });

    it('exposes per-column directions and arrow icons', () => {
      component.onSortChange('name');
      component.onSortChange('name'); // asc
      expect(component.sortDirectionName).toBe('asc');
      expect(component.sortIconName).toBe('arrow_upward');
      expect(component.sortDirectionCreatedAt).toBeNull();
      expect(component.sortIconCreatedAt).toBe('');

      component.onSortChange('latest_internal_episode_date'); // desc
      expect(component.sortDirectionLatestEpisode).toBe('desc');
      expect(component.sortIconLatestEpisode).toBe('arrow_downward');
    });
  });

  describe('view and columns', () => {
    it('switches between grid and list view', () => {
      component.toggleView(true);
      expect(component.isGridView).toBeTrue();
      component.toggleView(false);
      expect(component.isGridView).toBeFalse();
    });

    it('derives displayed columns from the selected flags', () => {
      component.updateDisplayedColumns();
      const before = component.displayedColumns.length;
      expect(before).toBeGreaterThan(0);

      const first = component.allColumns[0];
      const wasSelected = first.selected;
      first.selected = !wasSelected;
      component.updateDisplayedColumns();
      expect(component.displayedColumns.length).toBe(wasSelected ? before - 1 : before + 1);
      expect(component.isColumnSelected(first.id)).toBe(!wasSelected);
      expect(component.isColumnSelected('not-a-column')).toBeFalse();
      first.selected = wasSelected;
    });

    it('reports the telegram column selection flag', () => {
      expect(typeof component.isTgChannelIdColumnSelected).toBe('boolean');
    });
  });
});
