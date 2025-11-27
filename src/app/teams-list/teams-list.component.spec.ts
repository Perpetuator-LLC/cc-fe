// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TeamsListComponent } from './teams-list.component';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';

describe('TeamsListComponentComponent', () => {
  let component: TeamsListComponent;
  let fixture: ComponentFixture<TeamsListComponent>;

  beforeEach(async () => {
    const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));

    await TestBed.configureTestingModule({
      imports: [TeamsListComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [{ provide: Apollo, useValue: mockApollo }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
