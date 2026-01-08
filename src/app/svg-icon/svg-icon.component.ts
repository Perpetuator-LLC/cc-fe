// Copyright (c) 2025-2026 Perpetuator LLC
// import { Component, Input, OnInit } from '@angular/core';
// import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// import { HttpClient } from '@angular/common/http';
//
// @Component({
//   selector: 'app-svg-icon',
//   standalone: true,
//   templateUrl: './svg-icon.component.html',
//   styleUrl: './svg-icon.component.scss',
// })
// export class SvgIconComponent implements OnInit {
//   @Input() icon!: string;
//   @Input() width = '20';
//   @Input() height = '20';
//   svgContent: SafeHtml = '';
//
//   constructor(
//     private sanitizer: DomSanitizer,
//     private http: HttpClient,
//   ) {}
//
//   ngOnInit(): void {
//     const path = `/assets/icons/${this.icon}.svg`;
//     this.http.get(path, { responseType: 'text' }).subscribe({
//       next: (data) => {
//         const svgElement: SVGElement = new DOMParser().parseFromString(data, 'image/svg+xml').querySelector('svg')!;
//         if (svgElement) {
//           svgElement.setAttribute('width', this.width);
//           svgElement.setAttribute('height', this.height);
//           // Ensure SVG inherits color from parent (like mat-icon does)
//           svgElement.setAttribute('fill', 'currentColor');
//           this.svgContent = this.sanitizer.bypassSecurityTrustHtml(svgElement.outerHTML);
//         }
//       },
//       error: () => {
//         console.error(`Could not load SVG: ${path}`);
//       },
//     });
//   }
// }
