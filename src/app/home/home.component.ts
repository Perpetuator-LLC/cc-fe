import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import p5 from 'p5';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCard, MatCardHeader, MatCardContent, MatCardTitle, MatCardSubtitle, MatButton, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  protected isLoggedIn = this.authService.isLoggedIn;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild('p5Container', { static: true }) p5Container!: ElementRef;
  private p5Instance!: p5;

  constructor(
    private toolbarService: ToolbarService,
    protected authService: AuthService,
  ) {}

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    const sketch = (s: p5) => {
      const xspacing = 16;
      let w: number;
      let theta = 0.0;
      let amplitude = 75.0;
      const period = 500.0;
      let dx: number;
      let yvalues: number[];

      s.setup = () => {
        const containerWidth = this.p5Container.nativeElement.offsetWidth;
        const containerHeight = this.p5Container.nativeElement.offsetHeight;
        const canvas = s.createCanvas(containerWidth, containerHeight);
        // const canvas = s.createCanvas(s.windowWidth, 200);
        canvas.parent(this.p5Container.nativeElement);
        w = s.width + 16;
        dx = (s.TWO_PI / period) * xspacing;
        yvalues = new Array(Math.floor(w / xspacing));
      };

      s.draw = () => {
        s.clear();
        // s.background(1);
        // Calculate distance from the vertical center of the canvas
        // const distFromCenter = Math.abs(s.mouseY - s.height / 2);
        // Map the distance to amplitude:
        // When the mouse is at the center (distFromCenter = 0), amplitude will be 500.
        // When the mouse is at the top or bottom (distFromCenter = s.height / 2), amplitude will be 100.
        // amplitude = s.map(distFromCenter, 0, s.height / 2, 400, 10);
        amplitude = s.map(s.mouseY, 0, s.height, 200, -200);
        // amplitude = s.map(s.mouseX, 0, s.width, 100, 500);

        // Calculate the distance from the center of the canvas
        const distFromCenter = Math.abs(s.mouseX - s.width / 2);
        // Map the distance to a speed value
        const speed = s.map(distFromCenter, 0, s.width / 2, 0.1, 0.02);
        theta += speed;

        calcWave();
        renderWave();
      };

      function calcWave() {
        theta += 0.02;
        let x = theta;
        for (let i = 0; i < yvalues.length; i++) {
          yvalues[i] = s.sin(x) * amplitude;
          x += dx;
        }
      }

      function renderWave() {
        s.noStroke();
        s.fill(255, 100);
        // for (let i = 0; i < yvalues.length; i++) {
        //   s.ellipse(i * xspacing, s.height / 2 + yvalues[i], 16, 16);
        // }
        for (let i = 0; i < yvalues.length; i++) {
          const x = i * xspacing;
          // Calculate the distance to the nearest horizontal edge:
          const distanceToEdge = Math.min(x, s.width - x);
          // Map the distance to an alpha value.
          // When distanceToEdge is 0 (at the edge), set a low alpha (say 50)
          // When distanceToEdge is half the canvas width (center-ish), set a high alpha (255)
          const alpha = s.map(distanceToEdge, 0, s.width / 3, 0, 20);
          s.noStroke();
          // Use fill with an alpha value. (You can change the RGB values to your liking)
          s.fill(100, 100, 100, alpha);
          s.ellipse(x, s.height / 2 + yvalues[i], 16, 16);
        }
      }

      s.windowResized = () => {
        const containerWidth = this.p5Container.nativeElement.offsetWidth;
        const containerHeight = this.p5Container.nativeElement.offsetHeight;
        s.resizeCanvas(containerWidth, containerHeight);
        // s.resizeCanvas(s.windowWidth, 200);
        w = s.width + 16;
        dx = (s.TWO_PI / period) * xspacing;
        yvalues = new Array(Math.floor(w / xspacing));
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
