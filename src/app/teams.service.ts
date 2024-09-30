import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { TeamsResult } from './teams-list/teams-list.component';
import { catchError, map } from 'rxjs/operators';

// export interface TeamsResponse<T> extends ApolloQueryResult<T> {
//   errors?: [{ message: string }];
//   data: T;
//   loading: boolean;
//   networkStatus: NetworkStatus;
// }

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
    return this.apollo
      .mutate({
        mutation: CREATE_TEAM,
        variables: { name: name },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => result.data.createTeam),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          console.error('Full error response:', error.networkError?.error.errors);
          return throwError(() => new Error(error.networkError?.error.errors));
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
    return this.apollo
      .mutate({
        mutation: UPDATE_TEAM,
        variables: { id, name },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => result.data.updateTeam),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          console.error('Full error response:', error.networkError?.error.errors);
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

    return this.apollo
      .watchQuery<{ team: TeamsResult }>({
        query: GET_TEAM_BY_ID,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map((result) => result.data.team),
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

    return this.apollo
      .watchQuery<{ myTeams: TeamsResult[] }>({
        query: GET_MY_TEAMS,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map((result) => result.data.myTeams),
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
    return this.apollo
      .mutate({
        mutation: UPSERT_USER_TO_TEAM,
        variables: { teamId, userId, role },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => result.data.upsertUserToTeam.team),
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
    return this.apollo
      .mutate({
        mutation: REMOVE_USER_FROM_TEAM,
        variables: { teamId, userId },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => result.data.removeUserFromTeam.team),
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
    return this.apollo
      .query({
        query: GET_USER_AUTOCOMPLETE,
        variables: { query },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => result.data.getUserAutocomplete.results),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }
}
