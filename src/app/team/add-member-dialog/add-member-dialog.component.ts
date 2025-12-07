// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { UserAutocompleteComponent } from '../../user-autocomplete/user-autocomplete.component';
import { User } from '../../types';
import { Subscription } from 'rxjs';
import { TeamsService } from '../teams.service';
import { MessageService } from '../../message.service';
import { MemberResult } from '../teams.service';

export interface AddMemberDialogData {
  teamUuid: string;
  supportedRoles: string[];
  member?: MemberResult | null;
}

@Component({
  selector: 'app-add-member-dialog',
  templateUrl: './add-member-dialog.component.html',
  styleUrls: ['./add-member-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    TitleCasePipe,
    UserAutocompleteComponent,
  ],
})
export class AddMemberDialogComponent implements OnDestroy {
  newUserForm: FormGroup;
  users: User[] = [];
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddMemberDialogComponent>,
    private teamsService: TeamsService,
    private messageService: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: AddMemberDialogData,
  ) {
    const userUuidControl = { value: '', disabled: false };
    const roleControl = ['', Validators.required];

    if (this.data.member) {
      userUuidControl.value = this.data.member.user.uuid;
      roleControl[0] = this.data.member.role;
    }

    this.newUserForm = this.fb.group({
      userUuid: [userUuidControl.value, Validators.required],
      role: roleControl,
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  searchUsers(query: string) {
    if (query && query.length >= 3) {
      this.subscriptions.add(
        this.teamsService.users(query).subscribe({
          next: (users) => {
            this.users = users;
          },
          error: (err) => {
            this.messageService.error(`Failed to retrieve users: ${err.message}`);
            this.users = [];
          },
        }),
      );
    } else {
      this.users = [];
    }
  }

  onUserSelected(user: { uuid: string; username: string }) {
    this.newUserForm.patchValue({
      userUuid: user.uuid,
    });
  }

  onSubmit() {
    if (this.newUserForm.valid) {
      const formValue = this.newUserForm.value;
      this.dialogRef.close({
        userUuid: formValue.userUuid,
        role: formValue.role,
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
