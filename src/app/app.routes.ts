// Copyright (c) 2025 Perpetuator LLC
import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { PodcastsListComponent } from './podcasts-list/podcasts-list.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then((c) => c.HomeComponent),
    title: 'Home',
    data: {
      icon: 'home',
    },
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then((c) => c.RegisterComponent),
    title: 'Register',
    data: {
      icon: 'person_add',
    },
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((c) => c.LoginComponent),
    title: 'Login',
    data: {
      icon: 'login',
    },
  },
  {
    path: 'forgot',
    loadComponent: () => import('./forgot-password/forgot-password.component').then((c) => c.ForgotPasswordComponent),
    title: 'Forgot Password',
  },
  {
    path: 'verify',
    loadComponent: () => import('./verify-email/verify-email.component').then((c) => c.VerifyEmailComponent),
    title: 'Verify Email',
  },
  {
    path: 'resend',
    loadComponent: () =>
      import('./resend-verification/resend-verification.component').then((c) => c.ResendVerificationComponent),
    title: 'Resend Verification',
  },
  {
    path: 'change-email',
    loadComponent: () => import('./change-email/change-email.component').then((c) => c.ChangeEmailComponent),
    title: 'Change Email',
  },
  {
    path: 'cancel-change-email',
    loadComponent: () =>
      import('./cancel-change-email/cancel-change-email.component').then((c) => c.CancelChangeEmailComponent),
    title: 'Cancel Change Email',
  },
  {
    path: 'reset',
    loadComponent: () => import('./reset-password/reset-password.component').then((c) => c.ResetPasswordComponent),
    title: 'Reset Password',
  },
  {
    path: 'profile',
    loadComponent: () => import('./user-detail/user-detail.component').then((c) => c.UserDetailComponent),
    title: 'Profile',
    canActivate: [AuthGuard],
  },
  {
    path: 'podcasts',
    component: PodcastsListComponent,
    canActivate: [AuthGuard],
    title: 'Podcasts',
    data: {
      icon: 'graphic_eq',
    },
    children: [
      {
        path: 'tech',
        loadComponent: () => import('./episodes-list/episodes-list.component').then((m) => m.EpisodesListComponent),
        title: 'Tech Podcasts',
      },
      {
        path: 'music',
        loadComponent: () => import('./episode-detail/episode-detail.component').then((m) => m.EpisodeDetailComponent),
        title: 'Music Podcasts',
      },
    ],
  },

  // {
  //   path: 'podcasts',
  //   loadComponent: () => import('./podcasts-list/podcasts-list.component').then((c) => c.PodcastsListComponent),
  //   title: 'Podcasts',
  //   canActivate: [AuthGuard],
  //   data: {
  //     icon: 'graphic_eq',
  //   },
  // },
  {
    path: 'podcast/new',
    loadComponent: () => import('./new-podcast/new-podcast.component').then((c) => c.NewPodcastComponent),
    title: 'Create Podcast',
    canActivate: [AuthGuard],
  },
  {
    path: 'podcast/:uuid',
    loadComponent: () => import('./podcast-detail/podcast-detail.component').then((c) => c.PodcastDetailComponent),
    title: 'Podcast',
    canActivate: [AuthGuard],
  },
  {
    path: 'episode/:uuid',
    loadComponent: () => import('./episode-detail/episode-detail.component').then((c) => c.EpisodeDetailComponent),
    title: 'Episode',
    canActivate: [AuthGuard],
  },
  {
    path: 'episodes',
    loadComponent: () => import('./episodes-list/episodes-list.component').then((c) => c.EpisodesListComponent),
    title: 'Episodes',
    canActivate: [AuthGuard],
    data: {
      icon: 'animated_images',
    },
  },
  {
    path: 'news',
    loadComponent: () => import('./news/news.component').then((c) => c.NewsComponent),
    title: 'News',
    canActivate: [AuthGuard],
    data: {
      icon: 'breaking_news',
    },
  },
  {
    path: 'teams',
    loadComponent: () => import('./teams-list/teams-list.component').then((c) => c.TeamsListComponent),
    title: 'Teams',
    canActivate: [AuthGuard],
    data: {
      icon: 'groups',
    },
  },
  {
    path: 'scheduling',
    loadComponent: () => import('./scheduling/scheduling.component').then((c) => c.SchedulingComponent),
    title: 'Scheduling',
    canActivate: [AuthGuard],
    data: {
      icon: 'schedule',
    },
  },
  {
    path: 'team/new',
    loadComponent: () => import('./new-team/new-team.component').then((c) => c.NewTeamComponent),
    title: 'Create Team',
    canActivate: [AuthGuard],
  },
  {
    path: 'team/:uuid',
    loadComponent: () => import('./team-detail/team-detail.component').then((c) => c.TeamDetailComponent),
    title: 'Team',
    canActivate: [AuthGuard],
  },
  {
    path: 'jobs',
    loadComponent: () => import('./jobs-list/jobs-list.component').then((c) => c.JobsListComponent),
    title: 'Jobs',
    canActivate: [AuthGuard],
    data: {
      icon: 'work',
    },
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./transactions-list/transactions-list.component').then((c) => c.TransactionsListComponent),
    title: 'Transactions',
    canActivate: [AuthGuard],
    data: {
      icon: 'work',
    },
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders-list/orders-list.component').then((c) => c.OrdersListComponent),
    title: 'Orders',
    canActivate: [AuthGuard],
    data: {
      icon: 'work',
    },
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./privacy-policy/privacy-policy.component').then((c) => c.PrivacyPolicyComponent),
    title: 'Privacy',
    data: {
      icon: 'policy',
    },
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () =>
      import('./terms-and-conditions/terms-and-conditions.component').then((c) => c.TermsAndConditionsComponent),
    title: 'Terms',
    data: {
      icon: 'gavel',
    },
  },
];

export class AppRoutingModule {}
