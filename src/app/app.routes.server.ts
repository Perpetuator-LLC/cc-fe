// Copyright (c) 2025 Perpetuator LLC
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // ============================================================
  // SERVER-RENDERED ROUTES (Dynamic public pages for social sharing)
  // These routes need SSR to render Open Graph meta tags for social media crawlers
  // ============================================================
  {
    path: 'a/:code',
    renderMode: RenderMode.Server,
  },
  {
    path: 'podcasts/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'episodes/:id',
    renderMode: RenderMode.Server,
  },

  // ============================================================
  // CLIENT-RENDERED ROUTES (All other pages)
  // Using client rendering to avoid localStorage/sessionStorage issues during SSR
  // ============================================================
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
