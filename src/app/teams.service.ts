import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { TeamsResult } from './teams-list/teams-list.component';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class TeamsService {
  constructor(private apollo: Apollo) {}

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

    // interface CreateTeamResponse {
    //   data?: CreateTeamData;
    //   errors?: { message: string }[];
    // }

    return this.apollo
      .mutate<CreateTeamData>({
        mutation: CREATE_TEAM,
        variables: { name },
      })
      .pipe(
        map((result) => {
          if (result.errors) {
            throw new Error(result.errors.map((e) => e.message).join(', '));
          } else if (!result.data?.createTeam.success) {
            throw new Error(result.data?.createTeam.message);
          }
          return result.data.createTeam;
        }),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  updateTeam(id: string, name: string): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const UPDATE_TEAM = gql`
      mutation UpdateTeam($id: ID!, $name: String!) {
        updateTeam(id: $id, name: $name) {
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

    return this.apollo
      .mutate<UpdateTeamData>({
        mutation: UPDATE_TEAM,
        variables: { id, name },
      })
      .pipe(
        map((result) => {
          if (result.errors) {
            throw new Error(result.errors.map((e) => e.message).join(', '));
          } else if (!result.data?.updateTeam.success) {
            throw new Error(result.data?.updateTeam.message);
          }
          return result.data.updateTeam;
        }),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  getTeamById(id: string): Observable<TeamsResult> {
    const GET_TEAM_BY_ID = gql`
      query GetTeamById($id: ID!) {
        team(id: $id) {
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

    interface GetTeamByIdData {
      team: TeamsResult;
    }

    // interface GetTeamByIdResponse {
    //   data?: GetTeamByIdData;
    //   errors?: { message: string }[];
    // }

    return this.apollo
      .watchQuery<GetTeamByIdData>({
        query: GET_TEAM_BY_ID,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map((result) => {
          if (result.errors) {
            throw new Error(result.errors.map((e) => e.message).join(', '));
          } else if (!result.data?.team) {
            throw new Error('Team data is missing');
          }
          return result.data.team;
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
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

    // interface GetMyTeamsResponse {
    //   data?: GetMyTeamsData;
    //   errors?: { message: string }[];
    // }

    return this.apollo
      .watchQuery<GetMyTeamsData>({
        query: GET_MY_TEAMS,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map((result) => {
          if (result.errors) {
            throw new Error(result.errors.map((e) => e.message).join(', '));
          } else if (!result.data?.myTeams) {
            throw new Error('Teams data is missing');
          }
          return result.data.myTeams;
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
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

    // interface UpsertUserToTeamResponse {
    //   data?: UpsertUserToTeamData;
    //   errors?: { message: string }[];
    // }

    return this.apollo
      .mutate<UpsertUserToTeamData>({
        mutation: UPSERT_USER_TO_TEAM,
        variables: { teamId, userId, role },
      })
      .pipe(
        map((result) => {
          if (result.errors) {
            throw new Error(result.errors.map((e) => e.message).join(', '));
          } else if (!result.data?.upsertUserToTeam.success) {
            throw new Error(result.data?.upsertUserToTeam.message);
          }
          return result.data.upsertUserToTeam.team;
        }),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(error.message));
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

    // interface RemoveUserFromTeamResponse {
    //   data?: RemoveUserFromTeamData;
    //   errors?: { message: string }[];
    // }

    return this.apollo
      .mutate<RemoveUserFromTeamData>({
        mutation: REMOVE_USER_FROM_TEAM,
        variables: { teamId, userId },
      })
      .pipe(
        map((result) => {
          if (result.errors) {
            throw new Error(result.errors.map((e) => e.message).join(', '));
          } else if (!result.data?.removeUserFromTeam.success) {
            throw new Error(result.data?.removeUserFromTeam.message);
          }
          return result.data.removeUserFromTeam.team;
        }),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  getUserAutocomplete(query: string): Observable<{ id: string; username: string }[]> {
    const GET_USER_AUTOCOMPLETE = gql`
      query GetUserAutocomplete($query: String!) {
        getUserAutocomplete(query: $query) {
          success
          message
          results {
            id
            username
          }
        }
      }
    `;

    interface GetUserAutocompleteData {
      getUserAutocomplete: {
        success: boolean;
        message: string;
        results: { id: string; username: string }[];
      };
    }

    // interface GetUserAutocompleteResponse {
    //   data?: GetUserAutocompleteData;
    //   errors?: { message: string }[];
    // }

    return this.apollo
      .query<GetUserAutocompleteData>({
        query: GET_USER_AUTOCOMPLETE,
        variables: { query },
      })
      .pipe(
        map((result) => {
          if (result.errors) {
            throw new Error(result.errors.map((e) => e.message).join(', '));
          } else if (!result.data?.getUserAutocomplete.success) {
            throw new Error(result.data?.getUserAutocomplete.message);
          }
          return result.data.getUserAutocomplete.results;
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }
}
