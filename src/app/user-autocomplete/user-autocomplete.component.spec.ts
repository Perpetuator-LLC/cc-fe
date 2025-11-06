// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserAutocompleteComponent } from './user-autocomplete.component';
import { TeamsService } from '../teams.service';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('UserAutocompleteComponent', () => {
  let component: UserAutocompleteComponent;
  let fixture: ComponentFixture<UserAutocompleteComponent>;
  let mockTeamsService: jasmine.SpyObj<TeamsService>;

  beforeEach(async () => {
    mockTeamsService = jasmine.createSpyObj('TeamsService', ['getTeams']);

    await TestBed.configureTestingModule({
      imports: [UserAutocompleteComponent],
      providers: [provideAnimations(), { provide: TeamsService, useValue: mockTeamsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAutocompleteComponent);
    component = fixture.componentInstance;
    component.users = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
