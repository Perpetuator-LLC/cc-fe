// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserAutocompleteComponent } from './user-autocomplete.component';
import { TeamsService } from '../../team/teams.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { User } from '../../types';
import { SimpleChange } from '@angular/core';

describe('UserAutocompleteComponent', () => {
  let component: UserAutocompleteComponent;
  let fixture: ComponentFixture<UserAutocompleteComponent>;
  let mockTeamsService: jasmine.SpyObj<TeamsService>;

  const mockUsers: User[] = [
    { id: '1', uuid: '1', username: 'alice' },
    { id: '2', uuid: '2', username: 'bob' },
    { id: '3', uuid: '3', username: 'charlie' },
    { id: '4', uuid: '4', username: 'alison' },
  ];

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

  describe('Initialization', () => {
    it('should initialize with empty users array', () => {
      expect(component.users).toEqual([]);
      expect(component.searchControl.value).toBeNull();
    });

    it('should set initial user if provided', () => {
      const initialUser = mockUsers[0];
      component.initialUser = initialUser;
      component.ngOnInit();
      expect(component.searchControl.value).toEqual(initialUser);
    });

    it('should disable control if disabled input is true', () => {
      component.disabled = true;
      component.ngOnInit();
      expect(component.searchControl.disabled).toBe(true);
    });

    it('should enable control if disabled input is false', () => {
      component.disabled = false;
      component.ngOnInit();
      expect(component.searchControl.enabled).toBe(true);
    });

    it('should setup filtered users on init', () => {
      component.users = mockUsers;
      component.ngOnInit();
      expect(component.filteredUsers$).toBeDefined();
    });
  });

  describe('User Filtering', () => {
    beforeEach(() => {
      component.users = mockUsers;
      component.ngOnInit();
    });

    it('should filter users based on search input', fakeAsync(() => {
      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue('ali');
      tick(300); // debounceTime

      expect(filteredUsers.length).toBe(2);
      expect(filteredUsers.some((u) => u.username === 'alice')).toBe(true);
      expect(filteredUsers.some((u) => u.username === 'alison')).toBe(true);
    }));

    it('should be case insensitive when filtering', fakeAsync(() => {
      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue('ALI');
      tick(300);

      expect(filteredUsers.length).toBe(2);
    }));

    it('should return all users when search is empty', fakeAsync(() => {
      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue('');
      tick(300);

      expect(filteredUsers.length).toBe(mockUsers.length);
    }));

    it('should return empty array when no matches found', fakeAsync(() => {
      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue('nonexistent');
      tick(300);

      expect(filteredUsers.length).toBe(0);
    }));

    it('should handle User object as input value', fakeAsync(() => {
      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue(mockUsers[0]);
      tick(300);

      expect(filteredUsers.length).toBe(mockUsers.length);
    }));
  });

  describe('Search Value Changed Event', () => {
    it('should emit searchValueChanged when query length >= 3', fakeAsync(() => {
      spyOn(component.searchValueChanged, 'emit');
      component.users = mockUsers;
      component.ngOnInit();

      // Subscribe to trigger the observable
      component.filteredUsers$.subscribe();

      component.searchControl.setValue('ali');
      tick(300);

      expect(component.searchValueChanged.emit).toHaveBeenCalledWith('ali');
    }));

    it('should emit empty string when query length < 3', fakeAsync(() => {
      spyOn(component.searchValueChanged, 'emit');
      component.users = mockUsers;
      component.ngOnInit();

      // Subscribe to trigger the observable
      component.filteredUsers$.subscribe();

      component.searchControl.setValue('al');
      tick(300);

      expect(component.searchValueChanged.emit).toHaveBeenCalledWith('');
    }));

    it('should not emit for non-string values', fakeAsync(() => {
      spyOn(component.searchValueChanged, 'emit');
      component.users = mockUsers;
      component.ngOnInit();

      // Subscribe to trigger the observable
      component.filteredUsers$.subscribe();

      component.searchControl.setValue(mockUsers[0]);
      tick(300);

      expect(component.searchValueChanged.emit).not.toHaveBeenCalled();
    }));

    it('should trim whitespace from query', fakeAsync(() => {
      spyOn(component.searchValueChanged, 'emit');
      component.users = mockUsers;
      component.ngOnInit();

      // Subscribe to trigger the observable
      component.filteredUsers$.subscribe();

      component.searchControl.setValue('  alice  ');
      tick(300);

      expect(component.searchValueChanged.emit).toHaveBeenCalledWith('alice');
    }));
  });

  describe('User Selection', () => {
    it('should emit userSelected event when option is selected', () => {
      spyOn(component.userSelected, 'emit');
      const user = { uuid: '1', username: 'alice' };

      component.onOptionSelected(user);

      expect(component.userSelected.emit).toHaveBeenCalledWith(user);
    });

    it('should emit correct user data structure', () => {
      spyOn(component.userSelected, 'emit');
      const user = { uuid: '123', username: 'testuser' };

      component.onOptionSelected(user);

      expect(component.userSelected.emit).toHaveBeenCalledWith({
        uuid: '123',
        username: 'testuser',
      });
    });
  });

  describe('Display Function', () => {
    it('should return username for User object', () => {
      const user = mockUsers[0];
      const result = component.displayFn(user);
      expect(result).toBe('alice');
    });

    it('should return string value for string input', () => {
      const result = component.displayFn('testuser');
      expect(result).toBe('testuser');
    });

    it('should return empty string for null/undefined', () => {
      expect(component.displayFn(null as unknown as User)).toBe('');
      expect(component.displayFn(undefined as unknown as User)).toBe('');
    });
  });

  describe('isString Helper', () => {
    it('should return true for strings', () => {
      expect(component.isString('test')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(component.isString(mockUsers[0])).toBe(false);
      expect(component.isString(123)).toBe(false);
      expect(component.isString(null)).toBe(false);
      expect(component.isString(undefined)).toBe(false);
    });
  });

  describe('Clear Input', () => {
    it('should reset search control', () => {
      component.searchControl.setValue('test');
      component.clearInput();
      expect(component.searchControl.value).toBeNull();
    });

    it('should clear user object value', () => {
      component.searchControl.setValue(mockUsers[0]);
      component.clearInput();
      expect(component.searchControl.value).toBeNull();
    });
  });

  describe('ngOnChanges', () => {
    it('should update filtered users when users input changes', () => {
      spyOn(component as unknown as { setupFilteredUsers: () => void }, 'setupFilteredUsers');

      component.ngOnChanges({
        users: new SimpleChange([], mockUsers, false),
      });

      expect((component as unknown as { setupFilteredUsers: () => void }).setupFilteredUsers).toHaveBeenCalled();
    });

    it('should set initial user when initialUser changes', () => {
      const newUser = mockUsers[1];
      component.initialUser = newUser;

      component.ngOnChanges({
        initialUser: new SimpleChange(undefined, newUser, false),
      });

      expect(component.searchControl.value).toEqual(newUser);
    });

    it('should disable control when disabled changes to true', () => {
      component.searchControl.enable();
      component.disabled = true;

      component.ngOnChanges({
        disabled: new SimpleChange(false, true, false),
      });

      expect(component.searchControl.disabled).toBe(true);
    });

    it('should enable control when disabled changes to false', () => {
      component.searchControl.disable();
      component.disabled = false;

      component.ngOnChanges({
        disabled: new SimpleChange(true, false, false),
      });

      expect(component.searchControl.enabled).toBe(true);
    });

    it('should not update when initialUser is undefined', () => {
      const currentValue = component.searchControl.value;

      component.ngOnChanges({
        initialUser: new SimpleChange(undefined, undefined, false),
      });

      expect(component.searchControl.value).toEqual(currentValue);
    });
  });

  describe('Debouncing', () => {
    beforeEach(() => {
      component.users = mockUsers;
      component.ngOnInit();
    });

    it('should debounce search input by 300ms', fakeAsync(() => {
      let emitCount = 0;
      component.filteredUsers$.subscribe(() => emitCount++);

      tick(300); // Let initial startWith complete
      const initialCount = emitCount;

      component.searchControl.setValue('a');
      tick(100);
      component.searchControl.setValue('al');
      tick(100);
      component.searchControl.setValue('ali');
      tick(100);
      component.searchControl.setValue('alic');

      // Should not emit during debounce period
      expect(emitCount).toBe(initialCount);

      tick(300);
      // Should emit once after debounce completes
      expect(emitCount).toBe(initialCount + 1);
    }));

    it('should use distinctUntilChanged to avoid duplicate emissions', fakeAsync(() => {
      let emitCount = 0;
      component.filteredUsers$.subscribe(() => emitCount++);

      tick(300); // Let initial startWith complete
      const initialCount = emitCount;

      component.searchControl.setValue('alice');
      tick(300);
      expect(emitCount).toBe(initialCount + 1);

      component.searchControl.setValue('alice'); // Same value
      tick(300);

      expect(emitCount).toBe(initialCount + 1); // No additional emit
    }));
  });

  describe('Edge Cases', () => {
    it('should handle empty users array', fakeAsync(() => {
      component.users = [];
      component.ngOnInit();

      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue('test');
      tick(300);

      expect(filteredUsers.length).toBe(0);
    }));

    it('should handle undefined users', fakeAsync(() => {
      component.users = undefined as unknown as User[];
      component.ngOnInit();

      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue('test');
      tick(300);

      expect(filteredUsers.length).toBe(0);
    }));

    it('should handle null search value', fakeAsync(() => {
      component.users = mockUsers;
      component.ngOnInit();

      let filteredUsers: User[] = [];
      component.filteredUsers$.subscribe((users) => (filteredUsers = users));

      component.searchControl.setValue(null);
      tick(300);

      expect(filteredUsers).toBeDefined();
    }));

    it('should handle whitespace-only search', fakeAsync(() => {
      spyOn(component.searchValueChanged, 'emit');
      component.users = mockUsers;
      component.ngOnInit();

      // Subscribe to trigger the observable
      component.filteredUsers$.subscribe();

      component.searchControl.setValue('   ');
      tick(300);

      expect(component.searchValueChanged.emit).toHaveBeenCalledWith('');
    }));
  });
});
