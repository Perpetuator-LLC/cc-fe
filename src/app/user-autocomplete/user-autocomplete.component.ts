import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { Observable } from 'rxjs';
import { TeamsService } from '../teams.service';
import { map, startWith } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { MatInput, MatLabel } from '@angular/material/input';
import { User } from '../types';

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
export class UserAutocompleteComponent implements OnInit {
  searchControl = new FormControl();
  filteredUsers$: Observable<User[]> = new Observable<User[]>();

  @Output() userSelected = new EventEmitter<{ id: string; username: string }>();
  @Input() users!: User[];

  constructor(private teamsService: TeamsService) {}

  ngOnInit() {
    this.filteredUsers$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterUsers(value || '')),
      // debounceTime(300),
      // distinctUntilChanged(),
      // switchMap((query) => {
      //   if (typeof query === 'string') {
      //     return this.teamsService.getUserAutocomplete(query);
      //   } else {
      //     // This actually might work as once the user selects it, it is an object
      //     console.warn('Query is not a string:', query);
      //     return [];
      //   }
      // }),
    );
  }

  private _filterUsers(value: string): User[] {
    if (typeof value === 'object') {
      return [];
    }
    const filterValue = value.toLowerCase();
    return this.users.filter((user) => user.username.toLowerCase().includes(filterValue));
  }

  // onUserSelected(user: User) {
  //   this.userSelected.emit(user);
  // }

  // onOptionSelected(userId: string) {
  //   const selectedUser = this.filteredUsers$.pipe(map((users) => users.find((user) => user.id === userId)));
  //   selectedUser.subscribe((user) => {
  //     if (user) {
  //       this.userSelected.emit(user);
  //     }
  //   });
  // }

  onOptionSelected(user: { id: string; username: string }) {
    this.userSelected.emit(user);
    // this.searchControl.setValue(''); // Reset the search control value to an empty string
  }

  displayFn(user: { id: string; username: string }): string {
    return user ? user.username : '';
  }

  clearInput() {
    this.searchControl.reset();
  }
}
