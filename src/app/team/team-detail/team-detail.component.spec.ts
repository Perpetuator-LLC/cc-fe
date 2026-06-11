// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { TeamDetailComponent } from './team-detail.component';
import { MemberResult, TeamsResult, TeamsService } from '../teams.service';
import { MessageService } from '../../message.service';
import {
  provideMockApollo,
  provideMockOAuthService,
  provideMockActivatedRoute,
  provideMockToolbarService,
} from '../../testing/test-providers';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TeamDetailComponentComponent', () => {
  let component: TeamDetailComponent;
  let fixture: ComponentFixture<TeamDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamDetailComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        provideMockApollo(),
        provideMockOAuthService(),
        provideMockActivatedRoute({ uuid: '123' }),
        provideMockToolbarService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('member management', () => {
    function makeMember(uuid: string, role: string): MemberResult {
      return { user: { uuid, username: uuid }, role } as MemberResult;
    }

    beforeEach(() => {
      component['setMembers']([makeMember('owner-1', 'owner'), makeMember('member-1', 'publisher')]);
      component.teamForm.get('uuid')?.setValue('team-1');
    });

    it('exposes members as a form array', () => {
      expect(component.members.length).toBe(2);
      expect(component.members.at(1).get('user.uuid')?.value).toBe('member-1');
    });

    it('removes a non-owner immediately and rebuilds the member list', () => {
      const teamsService = TestBed.inject(TeamsService);
      const remove = spyOn(teamsService, 'removeUserFromTeam').and.returnValue(
        of({ uuid: 'team-1', name: 'Team', members: [makeMember('owner-1', 'owner')] } as unknown as TeamsResult),
      );
      component.removeUserFromTeam('member-1');
      expect(remove).toHaveBeenCalledWith('team-1', 'member-1');
      expect(component.members.length).toBe(1);
    });

    it('asks for confirmation before removing an owner', () => {
      const teamsService = TestBed.inject(TeamsService);
      const remove = spyOn(teamsService, 'removeUserFromTeam').and.returnValue(
        of({ uuid: 'team-1', name: 'Team', members: [] } as unknown as TeamsResult),
      );
      const dialog = TestBed.inject(MatDialog);
      spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as MatDialogRef<unknown>);
      component.removeUserFromTeam('owner-1');
      expect(dialog.open).toHaveBeenCalled();
      expect(remove).toHaveBeenCalledWith('team-1', 'owner-1');
    });

    it('reports an error when removal fails', () => {
      const teamsService = TestBed.inject(TeamsService);
      spyOn(teamsService, 'removeUserFromTeam').and.returnValue(throwError(() => new Error('denied')));
      const error = spyOn(TestBed.inject(MessageService), 'error');
      component.removeUserFromTeam('member-1');
      expect(error).toHaveBeenCalledWith('Failed to remove user: denied');
    });
  });

  describe('name editing', () => {
    it('enables the name control on first toggle', () => {
      expect(component.editingName).toBeFalse();
      component.onEditOrSaveName();
      expect(component.editingName).toBeTrue();
      expect(component.teamForm.get('name')?.enabled).toBeTrue();
    });

    it('skips saving while the form is invalid', () => {
      component.editingName = true;
      component.teamForm.get('name')?.setErrors({ required: true });
      component.saveTeam();
      expect(component.editingName).toBeTrue();
    });
  });
});
