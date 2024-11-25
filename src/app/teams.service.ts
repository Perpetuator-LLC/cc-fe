import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { TeamsResult } from './teams-list/teams-list.component';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';

export interface User {
  id: string;
  username: string;
}

@Injectable({
  providedIn: 'root',
})
export class TeamsService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  createTeam(name: string): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const CREATE_TEAM = gql`
      mutation CreateTeam($name: String!) {
        createTeam(name: $name) {
          success
          message
          team {
            id
            name
            members {
              role
              user {
                id
                username
              }
            }
          }
        }
      }
    `;

    interface CreateTeamData {
      createTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<CreateTeamData>({
      mutation: CREATE_TEAM,
      variables: { name },
    }).pipe(
      map((data) => {
        if (!data.createTeam.success) {
          throw new Error(data.createTeam.message);
        }
        return data.createTeam;
      }),
    );
  }

  updateTeam(
    id: string,
    name: string | null = null,
    podcastEnabled: boolean | null = null,
    podcastSlug: string | null = null,
  ): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const UPDATE_TEAM = gql`
      mutation UpdateTeam($id: ID!, $name: String!, $podcastEnabled: Boolean, $podcastSlug: String) {
        updateTeam(id: $id, name: $name, podcastEnabled: $podcastEnabled, podcastSlug: $podcastSlug) {
          success
          message
          team {
            id
            name
            podcastEnabled
            podcastSlug
            podcastUrl
            members {
              user {
                id
                username
              }
              role
            }
          }
        }
      }
    `;

    interface UpdateTeamData {
      updateTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    // interface UpdateTeamResponse {
    //   data?: UpdateTeamData;
    //   errors?: { message: string }[];
    // }

    return this.mutate<UpdateTeamData>({
      mutation: UPDATE_TEAM,
      variables: { id, name, podcastEnabled, podcastSlug },
    }).pipe(
      map((data) => {
        if (!data.updateTeam.success) {
          throw new Error(data.updateTeam.message);
        }
        return data.updateTeam;
      }),
    );
  }

  getTeamById(id: string): Observable<TeamsResult> {
    const GET_TEAM_BY_ID = gql`
      query GetTeamById($id: ID!) {
        team(id: $id) {
          id
          name
          podcastEnabled
          podcastSlug
          podcastUrl
          members {
            user {
              id
              username
            }
            role
          }
        }
      }
    `;

    interface GetTeamByIdData {
      team: TeamsResult;
    }

    return this.watchQuery<GetTeamByIdData>({
      query: GET_TEAM_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.team) {
          throw new Error('Team data is missing');
        }
        return data.team;
      }),
    );
  }

  getMyTeams(): Observable<TeamsResult[]> {
    const GET_MY_TEAMS = gql`
      query GetMyTeams {
        myTeams {
          id
          name
          members {
            user {
              id
              username
            }
            role
          }
        }
      }
    `;

    interface GetMyTeamsData {
      myTeams: TeamsResult[];
    }

    return this.watchQuery<GetMyTeamsData>({
      query: GET_MY_TEAMS,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.myTeams) {
          throw new Error('Teams data is missing');
        }
        return data.myTeams;
      }),
    );
  }

  upsertUserToTeam(teamId: string, userId: string, role: string): Observable<TeamsResult> {
    const UPSERT_USER_TO_TEAM = gql`
      mutation UpsertUserToTeam($teamId: ID!, $userId: ID!, $role: String!) {
        upsertUserToTeam(teamId: $teamId, userId: $userId, role: $role) {
          success
          message
          team {
            id
            name
            members {
              user {
                id
                username
              }
              role
            }
          }
        }
      }
    `;

    interface UpsertUserToTeamData {
      upsertUserToTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<UpsertUserToTeamData>({
      mutation: UPSERT_USER_TO_TEAM,
      variables: { teamId, userId, role },
    }).pipe(
      map((data) => {
        if (!data.upsertUserToTeam.success) {
          throw new Error(data.upsertUserToTeam.message);
        }
        return data.upsertUserToTeam.team;
      }),
    );
  }

  removeUserFromTeam(teamId: string, userId: string): Observable<TeamsResult> {
    const REMOVE_USER_FROM_TEAM = gql`
      mutation RemoveUserFromTeam($teamId: ID!, $userId: ID!) {
        removeUserFromTeam(teamId: $teamId, userId: $userId) {
          success
          message
          team {
            id
            name
            members {
              user {
                id
                username
              }
              role
            }
          }
        }
      }
    `;

    interface RemoveUserFromTeamData {
      removeUserFromTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<RemoveUserFromTeamData>({
      mutation: REMOVE_USER_FROM_TEAM,
      variables: { teamId, userId },
    }).pipe(
      map((data) => {
        if (!data.removeUserFromTeam.success) {
          throw new Error(data.removeUserFromTeam.message);
        }
        return data.removeUserFromTeam.team;
      }),
    );
  }

  getAllUsers(): Observable<User[]> {
    const GET_ALL_USERS = gql`
      query GetAllUsers {
        getAllUsers {
          success
          message
          results {
            id
            username
          }
        }
      }
    `;

    interface GetAllUsersData {
      getAllUsers: {
        success: boolean;
        message: string;
        results: User[];
      };
    }

    return this.query<GetAllUsersData>({
      query: GET_ALL_USERS,
    }).pipe(
      map((data) => {
        if (!data.getAllUsers.success) {
          throw new Error(data.getAllUsers.message);
        }
        return data.getAllUsers.results;
      }),
    );
  }
}
