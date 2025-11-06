// Copyright (c) 2025 Perpetuator LLC
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';

import { PodcastsService, PodcastsResult } from '../podcasts.service';
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
  imports: [
    CommonModule,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatCardTitle,
    MatCardSubtitle,
    MatButton,
    RouterLink,
    MatIcon,
    SvgIconComponent,
  ],
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

  gridPodcasts: PodcastsResult[] = [];

  constructor(
    private toolbarService: ToolbarService,
    protected authService: AuthService,
    private podcastsService: PodcastsService,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      forkJoin({
        stats: this.dashboardService.getStats(),
        podcasts: this.podcastsService.getPodcasts(3),
      }).subscribe({
        next: ({ stats, podcasts }) => {
          this.siteStats = stats;
          this.gridPodcasts = podcasts.podcasts;
          this.loadingStats = false;
        },
        error: (error) => {
          console.error(':: Home data loading error :: ', error);
          this.gridPodcasts = [];
          this.loadingStats = false;
        },
      });
    } else {
      this.dashboardService.getStats().subscribe({
        next: (stats) => {
          this.siteStats = stats;
          this.loadingStats = false;
        },
        error: (error) => {
          console.error(':: Stats API :: ', error);
          this.loadingStats = false;
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

  ngOnDestroy() {
    if (this.p5Instance) {
      this.p5Instance.remove();
    }
  }
}
