// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CreatePodcastCategoriesComponent } from './create-podcast-categories.component';
import { PodcastsService } from '../podcasts.service';
import { of } from 'rxjs';

describe('CreatePodcastCategoriesComponent', () => {
  let component: CreatePodcastCategoriesComponent;
  let fixture: ComponentFixture<CreatePodcastCategoriesComponent>;
  let mockPodcastsService: jasmine.SpyObj<PodcastsService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('PodcastsService', ['getPodcastCategories']);
    spy.getPodcastCategories.and.returnValue(
      of({
        Technology: ['AI', 'Programming', 'Cybersecurity'],
        Business: ['Startups', 'Finance', 'Marketing'],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [CreatePodcastCategoriesComponent, NoopAnimationsModule],
      providers: [{ provide: PodcastsService, useValue: spy }],
    }).compileComponents();

    mockPodcastsService = TestBed.inject(PodcastsService) as jasmine.SpyObj<PodcastsService>;
    fixture = TestBed.createComponent(CreatePodcastCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load categories and build options on init', () => {
    expect(mockPodcastsService.getPodcastCategories).toHaveBeenCalled();
    expect(component.categoryOptions.length).toBeGreaterThan(0);

    // Check that parent categories are included
    const parentOptions = component.categoryOptions.filter((opt) => opt.isParent);
    expect(parentOptions.length).toBe(2); // Technology and Business

    // Check that subcategories are included
    const subOptions = component.categoryOptions.filter((opt) => !opt.isParent);
    expect(subOptions.length).toBe(6); // 3 for Technology + 3 for Business
  });

  it('should build category options correctly', () => {
    const techParent = component.categoryOptions.find((opt) => opt.value === 'parent:Technology');
    expect(techParent).toBeTruthy();
    expect(techParent?.label).toBe('Technology');
    expect(techParent?.isParent).toBe(true);

    const aiSub = component.categoryOptions.find((opt) => opt.value === 'sub:Technology:AI');
    expect(aiSub).toBeTruthy();
    expect(aiSub?.label).toBe('AI');
    expect(aiSub?.isParent).toBe(false);
    expect(aiSub?.parent).toBe('Technology');
  });

  it('should handle parent category selection', () => {
    const onChangeSpy = spyOn(component as unknown as { onChange: (...args: unknown[]) => void }, 'onChange');
    // Parent selection is handled by the mat-select - component only processes sub: values
    component.onCategorySelectionChange([
      'sub:Technology:AI',
      'sub:Technology:Programming',
      'sub:Technology:Cybersecurity',
    ]);

    expect(component.value['Technology']).toEqual(['AI', 'Programming', 'Cybersecurity']);
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should handle subcategory selection', () => {
    const onChangeSpy = spyOn(component as unknown as { onChange: (...args: unknown[]) => void }, 'onChange');
    component.onCategorySelectionChange(['sub:Technology:AI']);

    expect(component.value['Technology']).toEqual(['AI']);
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should handle mixed selection', () => {
    const onChangeSpy = spyOn(component as unknown as { onChange: (...args: unknown[]) => void }, 'onChange');
    component.onCategorySelectionChange([
      'sub:Technology:AI',
      'sub:Technology:Programming',
      'sub:Technology:Cybersecurity',
      'sub:Business:Startups',
    ]);

    expect(component.value['Technology']).toEqual(['AI', 'Programming', 'Cybersecurity']);
    expect(component.value['Business']).toEqual(['Startups']);
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should get selected values correctly', () => {
    component.value = {
      Technology: ['AI', 'Programming'],
      Business: ['Startups'],
    };

    const selectedValues = component.getSelectedValues();
    expect(selectedValues).toContain('sub:Technology:AI');
    expect(selectedValues).toContain('sub:Technology:Programming');
    expect(selectedValues).toContain('sub:Business:Startups');
    expect(selectedValues.length).toBe(3); // Only subcategories, no parent
  });

  it('should get all selected categories for display', () => {
    component.value = {
      Technology: ['AI', 'Programming'],
      Business: ['Startups'],
    };

    const displayCategories = component.getAllSelectedCategories();
    expect(displayCategories).toContain('Technology > AI');
    expect(displayCategories).toContain('Technology > Programming');
    expect(displayCategories).toContain('Business > Startups');
  });

  it('should remove category correctly', () => {
    component.value = {
      Technology: ['AI', 'Programming'],
      Business: ['Startups'],
    };

    const onChangeSpy = spyOn(component as unknown as { onChange: (...args: unknown[]) => void }, 'onChange');
    component.removeCategory('Technology > AI');

    expect(component.value['Technology']).toEqual(['Programming']);
    expect(component.value['Business']).toEqual(['Startups']);
    expect(onChangeSpy).toHaveBeenCalled();
  });

  it('should remove parent category when all subcategories are removed', () => {
    component.value = {
      Technology: ['AI'],
    };

    const onChangeSpy = spyOn(component as unknown as { onChange: (...args: unknown[]) => void }, 'onChange');
    component.removeCategory('Technology > AI');

    expect(component.value['Technology']).toBeUndefined();
    expect(onChangeSpy).toHaveBeenCalled();
  });
});
