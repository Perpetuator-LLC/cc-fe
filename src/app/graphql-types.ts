import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /**
   * The `DateTime` scalar type represents a DateTime
   * value as specified by
   * [iso8601](https://en.wikipedia.org/wiki/ISO_8601).
   */
  DateTime: { input: string; output: string };
  /**
   * Allows use of a JSON String for input / output from the GraphQL schema.
   *
   * Use of this type is *not recommended* as you lose the benefits of having a defined, static
   * schema (one of the key benefits of GraphQL).
   */
  JSONString: { input: string; output: string };
  /**
   * Leverages the internal Python implementation of UUID (uuid.UUID) to provide native UUID objects
   * in fields, resolvers and input.
   */
  UUID: { input: string; output: string };
}

export interface CancelEmailChange {
  __typename?: 'CancelEmailChange';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface ChangePassword {
  __typename?: 'ChangePassword';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface CreateScheduleMutation {
  __typename?: 'CreateScheduleMutation';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface CreateTeam {
  __typename?: 'CreateTeam';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
  team: Maybe<TeamType>;
}

export interface CryptoArticleData {
  __typename?: 'CryptoArticleData';
  message: Maybe<Scalars['String']['output']>;
  results: Maybe<CryptoArticleResult>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface CryptoArticleResult {
  __typename?: 'CryptoArticleResult';
  audio: Maybe<Scalars['String']['output']>;
  content: Maybe<Scalars['String']['output']>;
  date: Maybe<Scalars['DateTime']['output']>;
  id: Maybe<Scalars['ID']['output']>;
  newsSummaries: Maybe<Array<Maybe<CryptoNewsResult>>>;
  team: Maybe<TeamType>;
  title: Maybe<Scalars['String']['output']>;
}

export interface CryptoArticlesData {
  __typename?: 'CryptoArticlesData';
  message: Maybe<Scalars['String']['output']>;
  results: Maybe<Array<Maybe<CryptoArticleResult>>>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface CryptoNewsData {
  __typename?: 'CryptoNewsData';
  message: Maybe<Scalars['String']['output']>;
  results: Maybe<Array<Maybe<CryptoNewsResult>>>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface CryptoNewsResult {
  __typename?: 'CryptoNewsResult';
  content: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['ID']['output']>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  source: Maybe<Scalars['String']['output']>;
  summary: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
  url: Maybe<Scalars['String']['output']>;
}

export interface DestroyTeam {
  __typename?: 'DestroyTeam';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface EmailChangeRequestType {
  __typename?: 'EmailChangeRequestType';
  newEmail: Maybe<Scalars['String']['output']>;
  verified: Maybe<Scalars['Boolean']['output']>;
}

export interface GraphQlData {
  __typename?: 'GraphQLData';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface JobStatus {
  __typename?: 'JobStatus';
  createdAt: Maybe<Scalars['DateTime']['output']>;
  error: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['UUID']['output']>;
  jobType: Maybe<Scalars['String']['output']>;
  result: Maybe<Scalars['String']['output']>;
  status: Maybe<Scalars['String']['output']>;
  updatedAt: Maybe<Scalars['DateTime']['output']>;
}

export interface Mutation {
  __typename?: 'Mutation';
  cancelEmailChange: Maybe<CancelEmailChange>;
  changePassword: Maybe<ChangePassword>;
  createCryptoArticleData: Maybe<CryptoArticleData>;
  createSchedule: Maybe<CreateScheduleMutation>;
  createTeam: Maybe<CreateTeam>;
  destroyTeam: Maybe<DestroyTeam>;
  extractCryptoNewsData: Maybe<GraphQlData>;
  fetchCryptoNewsData: Maybe<SubmitJobData>;
  publishCryptoArticleAudio: Maybe<GraphQlData>;
  removeUserFromTeam: Maybe<RemoveUserFromTeam>;
  resendEmailChange: Maybe<ResendEmailChange>;
  retryJobs: Maybe<RetryJobs>;
  summarizeCryptoNewsData: Maybe<GraphQlData>;
  updateCookieConsent: Maybe<UpdateCookieConsent>;
  updateCryptoArticleAudio: Maybe<GraphQlData>;
  updateCryptoArticleData: Maybe<CryptoArticleData>;
  updateSchedule: Maybe<UpdateScheduleMutation>;
  updateTeam: Maybe<UpdateTeam>;
  updateUserDetails: Maybe<UpdateUserDetails>;
  updateUserSetting: Maybe<GraphQlData>;
  upsertUserToTeam: Maybe<UpsertUserToTeam>;
}

export interface MutationChangePasswordArgs {
  password: Scalars['String']['input'];
}

export interface MutationCreateCryptoArticleDataArgs {
  ids: Array<InputMaybe<Scalars['Int']['input']>>;
  teamId: Scalars['ID']['input'];
}

export interface MutationCreateScheduleArgs {
  args: InputMaybe<Scalars['JSONString']['input']>;
  interval: Scalars['Int']['input'];
  kwargs: InputMaybe<Scalars['JSONString']['input']>;
  name: Scalars['String']['input'];
  task: Scalars['String']['input'];
}

export interface MutationCreateTeamArgs {
  name: Scalars['String']['input'];
}

export interface MutationDestroyTeamArgs {
  teamId: Scalars['ID']['input'];
}

export interface MutationExtractCryptoNewsDataArgs {
  ids: Array<InputMaybe<Scalars['Int']['input']>>;
}

export interface MutationPublishCryptoArticleAudioArgs {
  id: Scalars['ID']['input'];
}

export interface MutationRemoveUserFromTeamArgs {
  teamId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}

export interface MutationRetryJobsArgs {
  ids: Array<InputMaybe<Scalars['UUID']['input']>>;
}

export interface MutationSummarizeCryptoNewsDataArgs {
  force?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<InputMaybe<Scalars['Int']['input']>>;
}

export interface MutationUpdateCookieConsentArgs {
  accepted: Scalars['Boolean']['input'];
  version: Scalars['String']['input'];
}

export interface MutationUpdateCryptoArticleAudioArgs {
  id: Scalars['ID']['input'];
}

export interface MutationUpdateCryptoArticleDataArgs {
  content: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  title: Scalars['String']['input'];
}

export interface MutationUpdateScheduleArgs {
  enabled: InputMaybe<Scalars['Boolean']['input']>;
  interval: Scalars['Int']['input'];
  name: Scalars['String']['input'];
}

export interface MutationUpdateTeamArgs {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}

export interface MutationUpdateUserDetailsArgs {
  email: Scalars['String']['input'];
  username: Scalars['String']['input'];
}

export interface MutationUpdateUserSettingArgs {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
}

export interface MutationUpsertUserToTeamArgs {
  role: Scalars['String']['input'];
  teamId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}

export interface PaginatedJobStatus {
  __typename?: 'PaginatedJobStatus';
  currentPage: Maybe<Scalars['Int']['output']>;
  hasNext: Maybe<Scalars['Boolean']['output']>;
  hasPrevious: Maybe<Scalars['Boolean']['output']>;
  jobs: Maybe<Array<Maybe<JobStatus>>>;
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
  totalPages: Maybe<Scalars['Int']['output']>;
  totalRecords: Maybe<Scalars['Int']['output']>;
}

export interface Query {
  __typename?: 'Query';
  getAllUsers: Maybe<UserList>;
  getCryptoArticleData: Maybe<CryptoArticleData>;
  getCryptoArticlesData: Maybe<CryptoArticlesData>;
  getCryptoNewsData: Maybe<CryptoNewsData>;
  getEmailChangePending: Maybe<EmailChangeRequestType>;
  getUserCookieConsents: Maybe<Array<Maybe<UserCookieConsentType>>>;
  getUserDetails: Maybe<UserDetails>;
  getUserJobs: Maybe<PaginatedJobStatus>;
  getUserSettings: Maybe<UserSettingsData>;
  myTeams: Maybe<Array<Maybe<TeamType>>>;
  team: Maybe<TeamType>;
}

export interface QueryGetCryptoArticleDataArgs {
  id: Scalars['ID']['input'];
}

export interface QueryGetCryptoArticlesDataArgs {
  direction?: InputMaybe<Scalars['String']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
}

export interface QueryGetCryptoNewsDataArgs {
  ids: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
}

export interface QueryGetUserJobsArgs {
  ids: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  jobTypes: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  orderBy: InputMaybe<Scalars['String']['input']>;
  page: InputMaybe<Scalars['Int']['input']>;
  pageSize: InputMaybe<Scalars['Int']['input']>;
  statuses: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
}

export interface QueryGetUserSettingsArgs {
  keys: Array<InputMaybe<Scalars['String']['input']>>;
}

export interface QueryTeamArgs {
  id: Scalars['ID']['input'];
}

export interface RemoveUserFromTeam {
  __typename?: 'RemoveUserFromTeam';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
  team: Maybe<TeamType>;
}

export interface ResendEmailChange {
  __typename?: 'ResendEmailChange';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface RetryJobs {
  __typename?: 'RetryJobs';
  jobs: Maybe<Array<Maybe<JobStatus>>>;
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface SubmitJobData {
  __typename?: 'SubmitJobData';
  job: Maybe<JobStatus>;
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface TeamMembershipType {
  __typename?: 'TeamMembershipType';
  role: Maybe<Scalars['String']['output']>;
  user: Maybe<UserType>;
}

export interface TeamType {
  __typename?: 'TeamType';
  id: Maybe<Scalars['ID']['output']>;
  members: Maybe<Array<Maybe<TeamMembershipType>>>;
  name: Maybe<Scalars['String']['output']>;
}

export interface UpdateCookieConsent {
  __typename?: 'UpdateCookieConsent';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface UpdateScheduleMutation {
  __typename?: 'UpdateScheduleMutation';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface UpdateTeam {
  __typename?: 'UpdateTeam';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
  team: Maybe<TeamType>;
}

export interface UpdateUserDetails {
  __typename?: 'UpdateUserDetails';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface UpsertUserToTeam {
  __typename?: 'UpsertUserToTeam';
  message: Maybe<Scalars['String']['output']>;
  success: Maybe<Scalars['Boolean']['output']>;
  team: Maybe<TeamType>;
}

export interface UserCookieConsentType {
  __typename?: 'UserCookieConsentType';
  accepted: Maybe<Scalars['Boolean']['output']>;
  date: Maybe<Scalars['DateTime']['output']>;
  version: Maybe<Scalars['String']['output']>;
}

export interface UserDetails {
  __typename?: 'UserDetails';
  email: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['ID']['output']>;
  permissions: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  username: Maybe<Scalars['String']['output']>;
}

export interface UserList {
  __typename?: 'UserList';
  message: Maybe<Scalars['String']['output']>;
  results: Maybe<Array<Maybe<UserType>>>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface UserSettingData {
  __typename?: 'UserSettingData';
  key: Maybe<Scalars['String']['output']>;
  value: Maybe<Scalars['String']['output']>;
}

export interface UserSettingsData {
  __typename?: 'UserSettingsData';
  message: Maybe<Scalars['String']['output']>;
  results: Maybe<Array<Maybe<UserSettingData>>>;
  success: Maybe<Scalars['Boolean']['output']>;
}

export interface UserType {
  __typename?: 'UserType';
  id: Maybe<Scalars['ID']['output']>;
  username: Maybe<Scalars['String']['output']>;
}

export type GetUserCookieConsentsQueryVariables = Exact<{ [key: string]: never }>;

export type GetUserCookieConsentsQuery = {
  __typename?: 'Query';
  getUserCookieConsents: Array<{
    __typename?: 'UserCookieConsentType';
    version: string | null;
    accepted: boolean | null;
    date: string | null;
  } | null> | null;
};

export type UpdateCookieConsentMutationVariables = Exact<{
  version: Scalars['String']['input'];
  accepted: Scalars['Boolean']['input'];
}>;

export type UpdateCookieConsentMutation = {
  __typename?: 'Mutation';
  updateCookieConsent: { __typename?: 'UpdateCookieConsent'; success: boolean | null; message: string | null } | null;
};

export type GetUserJobsQueryVariables = Exact<{
  statuses: Array<Scalars['String']['input']> | Scalars['String']['input'];
  jobTypes: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  ids: InputMaybe<Array<Scalars['UUID']['input']> | Scalars['UUID']['input']>;
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
}>;

export type GetUserJobsQuery = {
  __typename?: 'Query';
  getUserJobs: {
    __typename?: 'PaginatedJobStatus';
    success: boolean | null;
    message: string | null;
    totalPages: number | null;
    currentPage: number | null;
    hasNext: boolean | null;
    hasPrevious: boolean | null;
    jobs: Array<{
      __typename?: 'JobStatus';
      id: string | null;
      jobType: string | null;
      status: string | null;
      error: string | null;
      result: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    } | null> | null;
  } | null;
};

export type RetryJobsMutationVariables = Exact<{
  ids: Array<InputMaybe<Scalars['UUID']['input']>> | InputMaybe<Scalars['UUID']['input']>;
}>;

export type RetryJobsMutation = {
  __typename?: 'Mutation';
  retryJobs: {
    __typename?: 'RetryJobs';
    success: boolean | null;
    message: string | null;
    jobs: Array<{
      __typename?: 'JobStatus';
      id: string | null;
      jobType: string | null;
      status: string | null;
      error: string | null;
      result: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    } | null> | null;
  } | null;
};

export type CreateTeamMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;

export type CreateTeamMutation = {
  __typename?: 'Mutation';
  createTeam: {
    __typename?: 'CreateTeam';
    success: boolean | null;
    message: string | null;
    team: {
      __typename?: 'TeamType';
      id: string | null;
      name: string | null;
      members: Array<{
        __typename?: 'TeamMembershipType';
        role: string | null;
        user: { __typename?: 'UserType'; id: string | null; username: string | null } | null;
      } | null> | null;
    } | null;
  } | null;
};

export type UpdateTeamMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;

export type UpdateTeamMutation = {
  __typename?: 'Mutation';
  updateTeam: {
    __typename?: 'UpdateTeam';
    success: boolean | null;
    message: string | null;
    team: {
      __typename?: 'TeamType';
      id: string | null;
      name: string | null;
      members: Array<{
        __typename?: 'TeamMembershipType';
        role: string | null;
        user: { __typename?: 'UserType'; id: string | null; username: string | null } | null;
      } | null> | null;
    } | null;
  } | null;
};

export type GetTeamByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetTeamByIdQuery = {
  __typename?: 'Query';
  team: {
    __typename?: 'TeamType';
    id: string | null;
    name: string | null;
    members: Array<{
      __typename?: 'TeamMembershipType';
      role: string | null;
      user: { __typename?: 'UserType'; id: string | null; username: string | null } | null;
    } | null> | null;
  } | null;
};

export type GetMyTeamsQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyTeamsQuery = {
  __typename?: 'Query';
  myTeams: Array<{
    __typename?: 'TeamType';
    id: string | null;
    name: string | null;
    members: Array<{
      __typename?: 'TeamMembershipType';
      role: string | null;
      user: { __typename?: 'UserType'; id: string | null; username: string | null } | null;
    } | null> | null;
  } | null> | null;
};

export type UpsertUserToTeamMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  role: Scalars['String']['input'];
}>;

export type UpsertUserToTeamMutation = {
  __typename?: 'Mutation';
  upsertUserToTeam: {
    __typename?: 'UpsertUserToTeam';
    success: boolean | null;
    message: string | null;
    team: {
      __typename?: 'TeamType';
      id: string | null;
      name: string | null;
      members: Array<{
        __typename?: 'TeamMembershipType';
        role: string | null;
        user: { __typename?: 'UserType'; id: string | null; username: string | null } | null;
      } | null> | null;
    } | null;
  } | null;
};

export type RemoveUserFromTeamMutationVariables = Exact<{
  teamId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
}>;

export type RemoveUserFromTeamMutation = {
  __typename?: 'Mutation';
  removeUserFromTeam: {
    __typename?: 'RemoveUserFromTeam';
    success: boolean | null;
    message: string | null;
    team: {
      __typename?: 'TeamType';
      id: string | null;
      name: string | null;
      members: Array<{
        __typename?: 'TeamMembershipType';
        role: string | null;
        user: { __typename?: 'UserType'; id: string | null; username: string | null } | null;
      } | null> | null;
    } | null;
  } | null;
};

export type GetAllUsersQueryVariables = Exact<{ [key: string]: never }>;

export type GetAllUsersQuery = {
  __typename?: 'Query';
  getAllUsers: {
    __typename?: 'UserList';
    success: boolean | null;
    message: string | null;
    results: Array<{ __typename?: 'UserType'; id: string | null; username: string | null } | null> | null;
  } | null;
};

export type GetUserSettingsQueryVariables = Exact<{ [key: string]: never }>;

export type GetUserSettingsQuery = {
  __typename?: 'Query';
  getUserSettings: {
    __typename?: 'UserSettingsData';
    success: boolean | null;
    message: string | null;
    results: Array<{ __typename?: 'UserSettingData'; key: string | null; value: string | null } | null> | null;
  } | null;
};

export type UpdateUserSettingMutationVariables = Exact<{
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
}>;

export type UpdateUserSettingMutation = {
  __typename?: 'Mutation';
  updateUserSetting: { __typename?: 'GraphQLData'; success: boolean | null; message: string | null } | null;
};

export type ChangePasswordMutationVariables = Exact<{
  password: Scalars['String']['input'];
}>;

export type ChangePasswordMutation = {
  __typename?: 'Mutation';
  changePassword: { __typename?: 'ChangePassword'; success: boolean | null; message: string | null } | null;
};

export type GetUserDetailsQueryVariables = Exact<{ [key: string]: never }>;

export type GetUserDetailsQuery = {
  __typename?: 'Query';
  getUserDetails: {
    __typename?: 'UserDetails';
    id: string | null;
    email: string | null;
    username: string | null;
    permissions: Array<string | null> | null;
  } | null;
};

export type GetEmailChangePendingQueryVariables = Exact<{ [key: string]: never }>;

export type GetEmailChangePendingQuery = {
  __typename?: 'Query';
  getEmailChangePending: { __typename?: 'EmailChangeRequestType'; newEmail: string | null } | null;
};

export type CancelEmailChangeMutationVariables = Exact<{ [key: string]: never }>;

export type CancelEmailChangeMutation = {
  __typename?: 'Mutation';
  cancelEmailChange: { __typename?: 'CancelEmailChange'; success: boolean | null; message: string | null } | null;
};

export type ResendEmailChangeMutationVariables = Exact<{ [key: string]: never }>;

export type ResendEmailChangeMutation = {
  __typename?: 'Mutation';
  resendEmailChange: { __typename?: 'ResendEmailChange'; success: boolean | null; message: string | null } | null;
};

export type UpdateUserDetailsMutationVariables = Exact<{
  username: Scalars['String']['input'];
  email: Scalars['String']['input'];
}>;

export type UpdateUserDetailsMutation = {
  __typename?: 'Mutation';
  updateUserDetails: { __typename?: 'UpdateUserDetails'; success: boolean | null; message: string | null } | null;
};

export const GetUserCookieConsentsDocument = gql`
  query GetUserCookieConsents {
    getUserCookieConsents {
      version
      accepted
      date
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class GetUserCookieConsentsGQL extends Apollo.Query<
  GetUserCookieConsentsQuery,
  GetUserCookieConsentsQueryVariables
> {
  document = GetUserCookieConsentsDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const UpdateCookieConsentDocument = gql`
  mutation UpdateCookieConsent($version: String!, $accepted: Boolean!) {
    updateCookieConsent(version: $version, accepted: $accepted) {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class UpdateCookieConsentGQL extends Apollo.Mutation<
  UpdateCookieConsentMutation,
  UpdateCookieConsentMutationVariables
> {
  document = UpdateCookieConsentDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const GetUserJobsDocument = gql`
  query GetUserJobs($statuses: [String!]!, $jobTypes: [String!], $ids: [UUID!], $page: Int!, $pageSize: Int!) {
    getUserJobs(statuses: $statuses, jobTypes: $jobTypes, ids: $ids, page: $page, pageSize: $pageSize) {
      success
      message
      totalPages
      currentPage
      hasNext
      hasPrevious
      jobs {
        id
        jobType
        status
        error
        result
        createdAt
        updatedAt
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class GetUserJobsGQL extends Apollo.Query<GetUserJobsQuery, GetUserJobsQueryVariables> {
  document = GetUserJobsDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const RetryJobsDocument = gql`
  mutation RetryJobs($ids: [UUID]!) {
    retryJobs(ids: $ids) {
      success
      message
      jobs {
        id
        jobType
        status
        error
        result
        createdAt
        updatedAt
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class RetryJobsGQL extends Apollo.Mutation<RetryJobsMutation, RetryJobsMutationVariables> {
  document = RetryJobsDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const CreateTeamDocument = gql`
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

@Injectable({
  providedIn: 'root',
})
export class CreateTeamGQL extends Apollo.Mutation<CreateTeamMutation, CreateTeamMutationVariables> {
  document = CreateTeamDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const UpdateTeamDocument = gql`
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

@Injectable({
  providedIn: 'root',
})
export class UpdateTeamGQL extends Apollo.Mutation<UpdateTeamMutation, UpdateTeamMutationVariables> {
  document = UpdateTeamDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const GetTeamByIdDocument = gql`
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

@Injectable({
  providedIn: 'root',
})
export class GetTeamByIdGQL extends Apollo.Query<GetTeamByIdQuery, GetTeamByIdQueryVariables> {
  document = GetTeamByIdDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const GetMyTeamsDocument = gql`
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

@Injectable({
  providedIn: 'root',
})
export class GetMyTeamsGQL extends Apollo.Query<GetMyTeamsQuery, GetMyTeamsQueryVariables> {
  document = GetMyTeamsDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const UpsertUserToTeamDocument = gql`
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

@Injectable({
  providedIn: 'root',
})
export class UpsertUserToTeamGQL extends Apollo.Mutation<UpsertUserToTeamMutation, UpsertUserToTeamMutationVariables> {
  document = UpsertUserToTeamDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const RemoveUserFromTeamDocument = gql`
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

@Injectable({
  providedIn: 'root',
})
export class RemoveUserFromTeamGQL extends Apollo.Mutation<
  RemoveUserFromTeamMutation,
  RemoveUserFromTeamMutationVariables
> {
  document = RemoveUserFromTeamDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const GetAllUsersDocument = gql`
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

@Injectable({
  providedIn: 'root',
})
export class GetAllUsersGQL extends Apollo.Query<GetAllUsersQuery, GetAllUsersQueryVariables> {
  document = GetAllUsersDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const GetUserSettingsDocument = gql`
  query GetUserSettings {
    getUserSettings(keys: [""]) {
      success
      message
      results {
        key
        value
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class GetUserSettingsGQL extends Apollo.Query<GetUserSettingsQuery, GetUserSettingsQueryVariables> {
  document = GetUserSettingsDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const UpdateUserSettingDocument = gql`
  mutation UpdateUserSetting($key: String!, $value: String!) {
    updateUserSetting(key: $key, value: $value) {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class UpdateUserSettingGQL extends Apollo.Mutation<
  UpdateUserSettingMutation,
  UpdateUserSettingMutationVariables
> {
  document = UpdateUserSettingDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const ChangePasswordDocument = gql`
  mutation ChangePassword($password: String!) {
    changePassword(password: $password) {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class ChangePasswordGQL extends Apollo.Mutation<ChangePasswordMutation, ChangePasswordMutationVariables> {
  document = ChangePasswordDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const GetUserDetailsDocument = gql`
  query GetUserDetails {
    getUserDetails {
      id
      email
      username
      permissions
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class GetUserDetailsGQL extends Apollo.Query<GetUserDetailsQuery, GetUserDetailsQueryVariables> {
  document = GetUserDetailsDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const GetEmailChangePendingDocument = gql`
  query GetEmailChangePending {
    getEmailChangePending {
      newEmail
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class GetEmailChangePendingGQL extends Apollo.Query<
  GetEmailChangePendingQuery,
  GetEmailChangePendingQueryVariables
> {
  document = GetEmailChangePendingDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const CancelEmailChangeDocument = gql`
  mutation CancelEmailChange {
    cancelEmailChange {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class CancelEmailChangeGQL extends Apollo.Mutation<
  CancelEmailChangeMutation,
  CancelEmailChangeMutationVariables
> {
  document = CancelEmailChangeDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const ResendEmailChangeDocument = gql`
  mutation ResendEmailChange {
    resendEmailChange {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class ResendEmailChangeGQL extends Apollo.Mutation<
  ResendEmailChangeMutation,
  ResendEmailChangeMutationVariables
> {
  document = ResendEmailChangeDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
export const UpdateUserDetailsDocument = gql`
  mutation UpdateUserDetails($username: String!, $email: String!) {
    updateUserDetails(username: $username, email: $email) {
      success
      message
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class UpdateUserDetailsGQL extends Apollo.Mutation<
  UpdateUserDetailsMutation,
  UpdateUserDetailsMutationVariables
> {
  document = UpdateUserDetailsDocument;

  constructor(apollo: Apollo.Apollo) {
    super(apollo);
  }
}
