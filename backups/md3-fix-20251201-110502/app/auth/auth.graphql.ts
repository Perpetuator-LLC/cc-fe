// Copyright (c) 2025 Perpetuator LLC
import { gql } from 'apollo-angular';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  tokens?: AuthTokens;
  verificationEmailSent?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  tokens?: AuthTokens;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  tokens?: AuthTokens;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  tokens?: AuthTokens;
}

export interface MeResponse {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
}

export const REGISTER_USER = gql`
  mutation RegisterUser(
    $username: String!
    $email: String!
    $password1: String!
    $password2: String!
    $acceptTermsOfService: Boolean!
    $acceptPrivacyPolicy: Boolean!
    $tosSignature: String
    $ppSignature: String
  ) {
    register(
      username: $username
      email: $email
      password1: $password1
      password2: $password2
      acceptTermsOfService: $acceptTermsOfService
      acceptPrivacyPolicy: $acceptPrivacyPolicy
      tosSignature: $tosSignature
      ppSignature: $ppSignature
    ) {
      success
      message
      user {
        id
        username
        email
        isVerified
      }
      tokens {
        access
        refresh
      }
      verificationEmailSent
    }
  }
`;

export const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      success
      message
      user {
        id
        username
        email
        isVerified
      }
      tokens {
        access
        refresh
      }
    }
  }
`;

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      success
      message
      user {
        id
        username
        email
        isVerified
      }
      tokens {
        access
        refresh
      }
    }
  }
`;

export const RESEND_VERIFICATION = gql`
  mutation ResendVerificationEmail($email: String!) {
    resendVerificationEmail(email: $email) {
      success
      message
    }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $password1: String!, $password2: String!) {
    resetPassword(token: $token, password1: $password1, password2: $password2) {
      success
      message
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refresh: String!) {
    refreshToken(refresh: $refresh) {
      success
      message
      tokens {
        access
        refresh
      }
    }
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      username
      email
      isVerified
    }
  }
`;
