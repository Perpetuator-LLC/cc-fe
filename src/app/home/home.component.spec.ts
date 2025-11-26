// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './home.component';
import { ToolbarService } from '../toolbar.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;

  beforeEach(async () => {
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['getViewContainerRef']);
    const mockViewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef);

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [provideHttpClient(), { provide: ToolbarService, useValue: mockToolbarService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set up the toolbar with the toolbar template', () => {
    fixture.detectChanges();
    expect(mockToolbarService.getViewContainerRef).toHaveBeenCalled();
    expect(mockToolbarService.getViewContainerRef().clear).toHaveBeenCalled();
    expect(mockToolbarService.getViewContainerRef().createEmbeddedView).toHaveBeenCalledWith(component.toolbarTemplate);
  });
});
