// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
import { TeamsService } from '../../team/teams.service';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { MatInput, MatLabel } from '@angular/material/input';
import { User } from '../../types';

@Component({
  selector: 'app-user-autocomplete',
  standalone: true,
  imports: [
    MatFormField,
    ReactiveFormsModule,
    MatAutocompleteTrigger,
    MatAutocomplete,
    MatOption,
    AsyncPipe,
    MatInput,
    MatLabel,
  ],
  templateUrl: './user-autocomplete.component.html',
  styleUrl: './user-autocomplete.component.scss',
})
export class UserAutocompleteComponent implements OnInit, OnChanges {
  private teamsService = inject(TeamsService);

  searchControl = new FormControl();
  filteredUsers$: Observable<User[]> = new Observable<User[]>();

  @Output() userSelected = new EventEmitter<{ uuid: string; username: string }>();
  @Output() searchValueChanged = new EventEmitter<string>();
  @Input() users!: User[];
  @Input() initialUser: User | undefined;
  @Input() disabled = false;

  ngOnInit() {
    if (this.initialUser) {
      this.searchControl.setValue(this.initialUser);
    }
    if (this.disabled) {
      this.searchControl.disable();
    } else {
      this.searchControl.enable();
    }
    this.setupFilteredUsers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['users'] && this.searchControl) {
      this.setupFilteredUsers();
    }
    if (changes['initialUser'] && this.initialUser) {
      this.searchControl.setValue(this.initialUser);
    }
    if (changes['disabled']) {
      if (this.disabled) {
        this.searchControl.disable();
      } else {
        this.searchControl.enable();
      }
    }
  }

  private setupFilteredUsers() {
    this.filteredUsers$ = this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value || ''),
      debounceTime(300),
      distinctUntilChanged(),
      map((value) => {
        if (typeof value === 'string') {
          const query = value.trim();
          if (query.length >= 3) {
            this.searchValueChanged.emit(query);
          } else if (query.length < 3) {
            this.searchValueChanged.emit('');
          }
          return this._filterUsers(value);
        }
        return this._filterUsers(value || '');
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isString(value: any): boolean {
    return typeof value === 'string';
  }

  /** Pre-computed `typeof searchControl.value === 'string'` for the template. */
  get isSearchControlValueString(): boolean {
    return typeof this.searchControl.value === 'string';
  }

  private _filterUsers(value: string | User): User[] {
    if (typeof value !== 'string') {
      return this.users;
    }

    const filterValue = value.toLowerCase();
    // Only filter locally if we have users
    return this.users && this.users.length
      ? this.users.filter((user) => user.username.toLowerCase().includes(filterValue))
      : [];
  }

  onOptionSelected(user: { uuid: string; username: string }) {
    this.userSelected.emit(user);
  }

  displayFn(user: User | string): string {
    return user ? (typeof user === 'string' ? user : user.username) : '';
  }

  clearInput() {
    this.searchControl.reset();
  }
}
