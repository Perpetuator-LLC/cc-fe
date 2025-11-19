// Copyright (c) 2025 Perpetuator LLC
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton, MatAnchor } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

import { PodcastsService, PodcastsResult } from '../podcasts.service';
import { PublicPodcastHttpService, PublicPodcast } from '../public-podcast-http.service';
import { ShareService } from '../share.service';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, TemplateRef, OnInit } from '@angular/core';
import p5 from 'p5';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../dashboard.service';
import { SiteStatistics } from '../interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardContent, MatButton, MatAnchor, RouterLink, MatIcon, SvgIconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy, OnInit {
  protected isLoggedIn = this.authService.isLoggedIn;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild('p5Container', { static: true }) p5Container!: ElementRef;
  private p5Instance!: p5;
  siteStats: SiteStatistics | undefined;
  loadingStats = true;

  authPodcasts: PodcastsResult[] = [];
  publicPodcasts: PublicPodcast[] = [];
  recentPodcasts: PublicPodcast[] = [];
  loadingRecentPodcasts = true;

  constructor(
    private toolbarService: ToolbarService,
    protected authService: AuthService,
    private podcastsService: PodcastsService,
    private publicPodcastService: PublicPodcastHttpService,
    private dashboardService: DashboardService,
    protected shareService: ShareService,
  ) {}

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      forkJoin({
        stats: this.dashboardService.getStats(),
        podcasts: this.podcastsService.getPodcasts(3),
      }).subscribe({
        next: ({ stats, podcasts }) => {
          this.siteStats = stats;
          this.authPodcasts = podcasts.podcasts;
          this.loadingStats = false;
        },
        error: (error) => {
          console.error(':: Home data loading error :: ', error);
          this.authPodcasts = [];
          this.loadingStats = false;
        },
      });
    } else {
      forkJoin({
        stats: this.dashboardService.getStats(),
        popular: this.publicPodcastService.getPodcasts(3, 'views'),
        recent: this.publicPodcastService.getPodcasts(6, 'recent'),
      }).subscribe({
        next: ({ stats, popular, recent }) => {
          this.siteStats = stats;
          this.publicPodcasts = popular.podcasts;

          // Filter out podcasts that are in the popular list
          const popularIds = new Set(this.publicPodcasts.map((p) => p.id));
          const filteredRecent = recent.podcasts.filter((p) => !popularIds.has(p.id));

          // Take the top 3 from filtered recent podcasts
          this.recentPodcasts = filteredRecent.slice(0, 3);

          this.loadingStats = false;
          this.loadingRecentPodcasts = false;
        },
        error: (error) => {
          console.error(':: Home data loading error :: ', error);
          this.publicPodcasts = [];
          this.recentPodcasts = [];
          this.loadingStats = false;
          this.loadingRecentPodcasts = false;
        },
      });
    }
  }

  ngAfterViewInit() {
    // Only set toolbar when logged in (regular layout)
    // Pre-login layout already has branding in its header
    if (this.isLoggedIn()) {
      const viewContainerRef = this.toolbarService.getViewContainerRef();
      viewContainerRef.clear();
      viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    }

    if (!this.p5Container || !this.p5Container.nativeElement) {
      return;
    }

    const sketch = (s: p5) => {
      const xspacing = 16;
      let w: number;
      const period = 500.0;
      let dx: number;

      const waves = [
        { phase: 0, minAmplitude: -50, maxAmplitude: 50, minSpeed: 0.02, maxSpeed: -0.1, yvalues: [] as number[] },
        { phase: 0, minAmplitude: -30, maxAmplitude: 30, minSpeed: 0.03, maxSpeed: 0.12, yvalues: [] as number[] },
        { phase: 0, minAmplitude: -60, maxAmplitude: 60, minSpeed: 0.015, maxSpeed: 0.08, yvalues: [] as number[] },
        { phase: 0, minAmplitude: -40, maxAmplitude: 40, minSpeed: 0.015, maxSpeed: -0.08, yvalues: [] as number[] },
      ];

      s.setup = () => {
        const containerWidth = this.p5Container.nativeElement.offsetWidth;
        const containerHeight = 500; //this.p5Container.nativeElement.offsetHeight;
        const canvas = s.createCanvas(containerWidth, containerHeight);
        canvas.parent(this.p5Container.nativeElement);
        w = s.width + xspacing;
        dx = (s.TWO_PI / period) * xspacing;
        waves.forEach((wave) => (wave.yvalues = new Array(Math.floor(w / xspacing))));
      };

      s.draw = () => {
        s.clear();
        waves.forEach((wave) => {
          // Map mouseY to amplitude
          const currentAmplitude = s.map(s.mouseY, 0, s.height, wave.maxAmplitude, wave.minAmplitude);
          // Map distance from center to speed
          const distFromCenter = Math.abs(s.mouseX - s.width / 2);
          const currentSpeed = s.map(distFromCenter, s.width / 2, 0, wave.maxSpeed, wave.minSpeed);

          wave.phase += currentSpeed;
          calcWave(wave, currentAmplitude);
          renderWave(wave);
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function calcWave(wave: any, amplitude: number) {
        let x = wave.phase;
        for (let i = 0; i < wave.yvalues.length; i++) {
          wave.yvalues[i] = s.sin(x) * amplitude;
          x += dx;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function renderWave(wave: any) {
        for (let i = 0; i < wave.yvalues.length; i++) {
          const x = i * xspacing;
          const distanceToEdge = Math.min(x, s.width - x);
          const alpha = s.map(distanceToEdge, 0, s.width / 3, 0, 20);
          s.noStroke();
          s.fill(100, 100, 100, alpha);
          s.ellipse(x, s.height / 2 + wave.yvalues[i], 16, 16);
        }
      }

      s.windowResized = () => {
        const containerWidth = this.p5Container.nativeElement.offsetWidth;
        const containerHeight = 500; //this.p5Container.nativeElement.offsetHeight;
        s.resizeCanvas(containerWidth, containerHeight);
        w = s.width + xspacing;
        dx = (s.TWO_PI / period) * xspacing;
        waves.forEach((wave) => (wave.yvalues = new Array(Math.floor(w / xspacing))));
      };
    };

    this.p5Instance = new p5(sketch);
  }

  protected formatTimeAgo(dateString: string | null): string {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  protected formatViewCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else if (count === 1) {
      return '1 view';
    } else {
      return `${count} views`;
    }
  }

  protected truncateDescription(description: string, maxLength = 350): string {
    if (!description || description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength).trim() + '...';
  }

  ngOnDestroy() {
    if (this.p5Instance) {
      this.p5Instance.remove();
    }
  }
}
