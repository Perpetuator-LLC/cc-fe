// Copyright (c) 2025 Perpetuator LLC
import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { PodcastsListComponent } from './podcast/podcasts-list/podcasts-list.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'dev/buttons',
    loadComponent: () =>
      import('./dev/button-showcase/button-showcase.component').then((c) => c.ButtonShowcaseComponent),
    title: 'Button Showcase',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then((c) => c.HomeComponent),
    title: 'Home',
    data: {
      icon: 'home',
      showInMenu: true,
    },
  },
  {
    path: 'media',
    pathMatch: 'full',
    redirectTo: 'media/podcasts',
  },
  {
    path: 'media',
    canActivate: [AuthGuard],
    title: 'Media',
    data: {
      icon: 'perm_media',
      showInMenu: true,
    },
    children: [
      {
        path: 'podcasts',
        component: PodcastsListComponent,
        title: 'Podcasts',
        data: {
          icon: 'graphic_eq',
        },
        children: [
          {
            path: 'tech',
            loadComponent: () =>
              import('./episode/episodes-list/episodes-list.component').then((m) => m.EpisodesListComponent),
            title: 'Tech Podcasts',
          },
          {
            path: 'music',
            loadComponent: () =>
              import('./episode/episode-detail/episode-detail.component').then((m) => m.EpisodeDetailComponent),
            title: 'Music Podcasts',
          },
        ],
      },
      {
        path: 'podcasts/new',
        loadComponent: () => import('./podcast/new-podcast/new-podcast.component').then((c) => c.NewPodcastComponent),
        title: 'Create Podcast',
      },
      {
        path: 'podcasts/:uuid',
        loadComponent: () =>
          import('./podcast/podcast-detail/podcast-detail.component').then((c) => c.PodcastDetailComponent),
        title: 'Podcast',
      },
      {
        path: 'episodes/:uuid',
        loadComponent: () =>
          import('./episode/episode-detail/episode-detail.component').then((c) => c.EpisodeDetailComponent),
        title: 'Episode',
        canDeactivate: [
          (component: { canDeactivate?: () => boolean }) => {
            return component.canDeactivate ? component.canDeactivate() : true;
          },
        ],
      },
      {
        path: 'episodes',
        loadComponent: () =>
          import('./episode/episodes-list/episodes-list.component').then((c) => c.EpisodesListComponent),
        title: 'Episodes',
        data: {
          icon: 'animated_images',
        },
      },
      {
        path: 'news',
        loadComponent: () => import('./news/news-list/news-list.component').then((c) => c.NewsListComponent),
        title: 'News',
        data: {
          icon: 'breaking_news',
        },
      },
      {
        path: 'topics',
        loadComponent: () => import('./topics/topics-list/topics-list.component').then((c) => c.TopicsListComponent),
        title: 'Topics',
        data: {
          icon: 'science',
        },
      },
      {
        path: 'topics/:uuid',
        loadComponent: () => import('./topics/topic-detail/topic-detail.component').then((c) => c.TopicDetailComponent),
        title: 'Topic Detail',
      },
    ],
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then((c) => c.RegisterComponent),
    title: 'Register',
    data: {
      icon: 'person_add',
      showInMenu: true,
    },
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((c) => c.LoginComponent),
    title: 'Login',
    data: {
      icon: 'login',
      showInMenu: true,
    },
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./auth/auth-callback/auth-callback.component').then((c) => c.AuthCallbackComponent),
    title: 'Authenticating...',
  },
  {
    path: 'forgot',
    loadComponent: () =>
      import('./auth/forgot-password/forgot-password.component').then((c) => c.ForgotPasswordComponent),
    title: 'Forgot Password',
  },
  {
    path: 'verify',
    loadComponent: () => import('./auth/verify-email/verify-email.component').then((c) => c.VerifyEmailComponent),
    title: 'Verify Email',
  },
  {
    path: 'verify-email', // Alias for backward compatibility with emails
    loadComponent: () => import('./auth/verify-email/verify-email.component').then((c) => c.VerifyEmailComponent),
    title: 'Verify Email',
  },
  {
    path: 'resend',
    loadComponent: () =>
      import('./auth/resend-verification/resend-verification.component').then((c) => c.ResendVerificationComponent),
    title: 'Resend Verification',
  },
  {
    path: 'change-email',
    loadComponent: () => import('./auth/change-email/change-email.component').then((c) => c.ChangeEmailComponent),
    title: 'Change Email',
  },
  {
    path: 'cancel-change-email',
    loadComponent: () =>
      import('./auth/cancel-change-email/cancel-change-email.component').then((c) => c.CancelChangeEmailComponent),
    title: 'Cancel Change Email',
  },
  {
    path: 'reset',
    loadComponent: () => import('./auth/reset-password/reset-password.component').then((c) => c.ResetPasswordComponent),
    title: 'Reset Password',
  },
  {
    path: 'reset-password', // Alias for backward compatibility with emails
    loadComponent: () => import('./auth/reset-password/reset-password.component').then((c) => c.ResetPasswordComponent),
    title: 'Reset Password',
  },
  {
    path: 'profile',
    loadComponent: () => import('./user/user-detail/user-detail.component').then((c) => c.UserDetailComponent),
    title: 'Profile',
    canActivate: [AuthGuard],
  },
  {
    path: 'news',
    loadComponent: () => import('./news/news-list/news-list.component').then((c) => c.NewsListComponent),
    title: 'News',
    canActivate: [AuthGuard],
    data: {
      icon: 'breaking_news',
    },
  },
  {
    path: 'teams',
    loadComponent: () => import('./team/teams-list/teams-list.component').then((c) => c.TeamsListComponent),
    title: 'Teams',
    canActivate: [AuthGuard],
    data: {
      icon: 'groups',
      showInMenu: true,
    },
  },
  {
    path: 'jobs',
    pathMatch: 'full',
    redirectTo: 'jobs/list',
  },
  {
    path: 'jobs',
    canActivate: [AuthGuard],
    title: 'Jobs',
    data: {
      icon: 'work',
      showInMenu: true,
    },
    children: [
      {
        path: 'list',
        loadComponent: () => import('./jobs/jobs-list/jobs-list.component').then((c) => c.JobsListComponent),
        title: 'Jobs List',
      },
      {
        path: 'scheduling',
        loadComponent: () => import('./scheduling/scheduling.component').then((c) => c.SchedulingComponent),
        title: 'Scheduling',
        data: {
          showInMenu: false,
        },
      },
    ],
  },
  {
    path: 'team/new',
    loadComponent: () => import('./team/new-team/new-team.component').then((c) => c.NewTeamComponent),
    title: 'Create Team',
    canActivate: [AuthGuard],
  },
  {
    path: 'team/:uuid',
    loadComponent: () => import('./team/team-detail/team-detail.component').then((c) => c.TeamDetailComponent),
    title: 'Team',
    canActivate: [AuthGuard],
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./credits/transactions-list/transactions-list.component').then((c) => c.TransactionsListComponent),
    title: 'Transactions',
    canActivate: [AuthGuard],
    data: {
      icon: 'receipt_long',
    },
  },
  {
    path: 'orders',
    loadComponent: () => import('./credits/orders-list/orders-list.component').then((c) => c.OrdersListComponent),
    title: 'Orders',
    canActivate: [AuthGuard],
    data: {
      icon: 'work',
    },
  },
  {
    path: 'affiliate',
    loadComponent: () =>
      import('./affiliate/affiliate-dashboard/affiliate-dashboard.component').then(
        (c) => c.AffiliateDashboardComponent,
      ),
    title: 'Affiliate Dashboard',
    canActivate: [AuthGuard],
    data: {
      icon: 'share',
    },
  },
  {
    path: 'affiliate-admin',
    loadComponent: () =>
      import('./affiliate/affiliate-admin/affiliate-admin.component').then((c) => c.AffiliateAdminComponent),
    title: 'Affiliate Admin',
    canActivate: [AuthGuard],
    data: {
      icon: 'admin_panel_settings',
    },
  },
  {
    path: 'api-keys',
    loadComponent: () =>
      import('./api-keys/api-keys-dashboard/api-keys-dashboard.component').then((c) => c.ApiKeysDashboardComponent),
    title: 'API Keys',
    canActivate: [AuthGuard],
    data: {
      icon: 'key',
    },
  },
  {
    path: 'affiliate/stripe/return',
    loadComponent: () =>
      import('./credits/stripe-onboarding-return/stripe-onboarding-return.component').then(
        (c) => c.StripeOnboardingReturnComponent,
      ),
    title: 'Stripe Setup',
    canActivate: [AuthGuard],
  },
  {
    path: 'a/:code',
    loadComponent: () =>
      import('./affiliate/affiliate-landing/affiliate-landing.component').then((c) => c.AffiliateLandingComponent),
    resolve: {
      affiliateData: () =>
        import('./affiliate/affiliate-landing/affiliate-landing.resolver').then((m) => m.affiliateLandingResolver),
    },
    title: 'Join My Network',
  },
  {
    path: 'finance',
    loadComponent: () => import('./finance/finance.component').then((c) => c.FinanceComponent),
    title: 'Finance',
    // canActivate: [AuthGuard],
    data: {
      showInMenu: true,
      icon: 'account_balance',
    },
  },
  {
    path: 'podcasts',
    loadComponent: () =>
      import('./browse/browse-podcasts/browse-podcasts.component').then((c) => c.BrowsePodcastsComponent),
    title: 'Browse Podcasts',
  },
  {
    path: 'podcasts/:id',
    loadComponent: () =>
      import('./public-podcast-page/public-podcast-page.component').then((c) => c.PublicPodcastPageComponent),
    title: 'Podcast',
  },
  {
    path: 'episodes',
    redirectTo: 'podcasts',
    pathMatch: 'full',
  },
  {
    path: 'episodes/:id',
    loadComponent: () =>
      import('./public-episode-page/public-episode-page.component').then((c) => c.PublicEpisodePageComponent),
    title: 'Episode',
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./public-categories/public-categories.component').then((c) => c.PublicCategoriesComponent),
    title: 'Browse Categories',
  },
  {
    path: 'categories/:category',
    loadComponent: () =>
      import('./podcast/category-podcasts/category-podcasts.component').then((c) => c.CategoryPodcastsComponent),
    title: 'Category',
  },
  {
    path: 'categories/:category/:subcategory',
    loadComponent: () =>
      import('./podcast/category-podcasts/category-podcasts.component').then((c) => c.CategoryPodcastsComponent),
    title: 'Category',
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./policy/privacy-policy/privacy-policy.component').then((c) => c.PrivacyPolicyComponent),
    title: 'Privacy',
    data: {
      icon: 'policy',
      showInMenu: false,
    },
  },
  {
    path: 'cookie-policy',
    loadComponent: () => import('./policy/cookie-policy/cookie-policy.component').then((c) => c.CookiePolicyComponent),
    title: 'Cookie Policy',
    data: {
      icon: 'cookie',
    },
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () =>
      import('./policy/terms-and-conditions/terms-and-conditions.component').then((c) => c.TermsAndConditionsComponent),
    title: 'Terms',
    data: {
      icon: 'gavel',
      showInMenu: false,
    },
  },
];

export class AppRoutingModule {}
