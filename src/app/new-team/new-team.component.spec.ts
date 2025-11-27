// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NewTeamComponent } from './new-team.component';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';

describe('NewTeamComponentComponent', () => {
  let component: NewTeamComponent;
  let fixture: ComponentFixture<NewTeamComponent>;

  beforeEach(async () => {
    const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));

    await TestBed.configureTestingModule({
      imports: [NewTeamComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [{ provide: Apollo, useValue: mockApollo }],
    }).compileComponents();

    fixture = TestBed.createComponent(NewTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
