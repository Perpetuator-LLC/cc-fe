// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, OnInit, ElementRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-svg-icon',
  standalone: true,
  template: `<span [innerHTML]="svgContent"></span>`,
})
export class SvgIconComponent implements OnInit {
  @Input() icon!: string;
  @Input() width = '20';
  @Input() height = '20';
  svgContent: SafeHtml = '';

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private elRef: ElementRef,
  ) {}

  ngOnInit(): void {
    const path = `/assets/icons/${this.icon}.svg`;
    this.http.get(path, { responseType: 'text' }).subscribe({
      next: (data) => {
        const svgElement: SVGElement = new DOMParser().parseFromString(data, 'image/svg+xml').querySelector('svg')!;
        if (svgElement) {
          svgElement.setAttribute('width', this.width);
          svgElement.setAttribute('height', this.height);
          this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgElement.outerHTML);
        }
      },
      error: () => {
        console.error(`Could not load SVG: ${path}`);
      },
    });
  }
}
