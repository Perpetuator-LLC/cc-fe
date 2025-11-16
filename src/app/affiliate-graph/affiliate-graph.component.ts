// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { AffiliateService, ExportAffiliateGraphResponse } from '../affiliate.service';
import { MessageService } from '../message.service';
import mermaid from 'mermaid';

// Extend Window interface to include our custom callback
// declare global {
//   interface Window {
//     showTooltip?: (uuid: string) => void;
//   }
// }

@Component({
  selector: 'app-affiliate-graph',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  templateUrl: './affiliate-graph.component.html',
  styleUrls: ['./affiliate-graph.component.scss'],
})
export class AffiliateGraphComponent implements OnInit, OnDestroy {
  @ViewChild('mermaidContainer', { static: false }) mermaidContainer: ElementRef<HTMLDivElement> | undefined;

  private subscriptions = new Subscription();
  loading = false;
  graphData: string | null = null;
  format: 'mermaid' | 'dot' | 'json' = 'mermaid';
  error: string | null = null;
  zoomLevel = 100;

  constructor(
    private affiliateService: AffiliateService,
    private messageService: MessageService,
    public dialogRef: MatDialogRef<AffiliateGraphComponent>,
  ) {
    // Initialize Mermaid with minimal config - we'll apply theme at render time
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });

    // Register the global showTooltip callback for Mermaid click events
    // window.showTooltip = (uuid: string) => {
    //   this.showNodeTooltip(uuid);
    // };
  }

  private getThemeColors() {
    // Try both document.documentElement and document.body for CSS variables
    const root = document.documentElement;
    const body = document.body;
    const rootStyles = getComputedStyle(root);
    const bodyStyles = getComputedStyle(body);

    // Helper to get variable from either location
    const getVar = (varName: string, fallback: string) => {
      const rootVal = rootStyles.getPropertyValue(varName).trim();
      const bodyVal = bodyStyles.getPropertyValue(varName).trim();
      return rootVal || bodyVal || fallback;
    };

    // Check for theme class on body or html
    const isDarkMode =
      body.classList.contains('dark-theme') ||
      body.classList.contains('dark-mode') ||
      root.classList.contains('dark-theme') ||
      root.classList.contains('dark-mode');

    console.log('Theme detection:', {
      isDarkMode,
      bodyClasses: Array.from(body.classList),
      rootClasses: Array.from(root.classList),
    });

    return {
      primary: getVar('--primary', isDarkMode ? '#90caf9' : '#1976d2'),
      borderColor: getVar('--border-color', isDarkMode ? '#555555' : '#e0e0e0'),
      bgColor:
        getVar('--toolbar-container-background-color', '') ||
        getVar('--theme-white', '') ||
        (isDarkMode ? '#2c2c2c' : '#ffffff'),
      textColor: getVar('--theme-color', isDarkMode ? '#e0e0e0' : '#333333'),
      descriptionColor: getVar('--description-color', isDarkMode ? '#999999' : '#666666'),
      secondaryLight: getVar('--secondary-light', isDarkMode ? '#3c3c3c' : '#f5f5f5'),
      successColor: getVar('--md-sys-color-success', '#4caf50'),
      warningColor: getVar('--md-sys-color-warning', '#ff9800'),
      errorColor: getVar('--md-sys-color-error', '#f44336'),
    };
  }

  ngOnInit(): void {
    this.loadGraph();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Clean up the global callback
    // delete window.showTooltip;
  }

  // showNodeTooltip(uuid: string): void {
  //   // Display the UUID in a user-friendly way
  //   // For now, we'll show it as a message, but this could be enhanced with a custom tooltip component
  //   this.messageService.info(`User UUID: ${uuid}`);
  //   console.log('Node clicked - UUID:', uuid);
  // }

  loadGraph(): void {
    this.loading = true;
    this.error = null;

    this.subscriptions.add(
      this.affiliateService.exportAffiliateGraph(this.format).subscribe({
        next: (response: ExportAffiliateGraphResponse) => {
          if (response.success && response.graphData) {
            this.graphData = response.graphData;
            this.format = response.format as 'mermaid' | 'dot' | 'json';
            this.loading = false;

            // Debug: Log the graph data to see what backend is providing
            // console.log('===== AFFILIATE GRAPH DATA =====');
            // console.log('Format:', this.format);
            // console.log('Graph Data:', this.graphData);
            // console.log('================================');

            setTimeout(() => this.renderGraph(), 100);
          } else {
            this.error = response.message || 'Failed to load graph data';
            this.loading = false;
          }
        },
        error: (err: Error) => {
          this.error = `Failed to load affiliate graph: ${err.message}`;
          this.messageService.error(this.error);
          this.loading = false;
        },
      }),
    );
  }

  async renderGraph(): Promise<void> {
    if (!this.graphData || !this.mermaidContainer) {
      return;
    }

    try {
      const container = this.mermaidContainer.nativeElement;
      container.innerHTML = '';

      // Ensure the graph is top-down by modifying the graph definition if needed
      let graphDataToRender = this.graphData;
      if (this.format === 'mermaid' && !graphDataToRender.includes('TB') && !graphDataToRender.includes('TD')) {
        // Replace LR (left-right) with TB (top-bottom) if present
        graphDataToRender = graphDataToRender.replace(/graph\s+LR/gi, 'graph TB');
        // If no direction specified, ensure TB is set
        if (!graphDataToRender.match(/graph\s+(TB|TD|BT|RL|LR)/i)) {
          graphDataToRender = graphDataToRender.replace(/^graph/i, 'graph TB');
        }
      }

      const id = `mermaid-graph-${Date.now()}`;
      const { svg } = await mermaid.render(id, graphDataToRender);

      container.innerHTML = svg;

      const svgElement = container.querySelector('svg');
      if (svgElement) {
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';

        // Apply theme colors directly to the SVG
        this.applyThemeToSvg(svgElement);

        // Make nodes interactive - add click handlers
        this.addNodeInteractivity(svgElement);
      }
    } catch (err) {
      console.error('Error rendering mermaid graph:', err);
      this.error = 'Failed to render graph visualization';
    }
  }

  private applyThemeToSvg(svgElement: SVGSVGElement): void {
    const colors = this.getThemeColors();

    // Debug: Log the theme colors being applied
    console.log('===== APPLYING THEME COLORS =====');
    console.log('Theme Colors:', colors);
    console.log('=================================');

    // Style all node rectangles
    const nodeRects = svgElement.querySelectorAll('.node rect, .node polygon, .node circle');
    console.log(`Found ${nodeRects.length} node shapes to style`);

    nodeRects.forEach((rect) => {
      (rect as SVGElement).style.fill = colors.bgColor;
      (rect as SVGElement).style.stroke = colors.borderColor;
      (rect as SVGElement).style.strokeWidth = '2px';
    });

    // Style all node labels/text
    const labels = svgElement.querySelectorAll('.nodeLabel, .label');
    console.log(`Found ${labels.length} node labels to style`);

    labels.forEach((label) => {
      (label as HTMLElement).style.color = colors.textColor;
    });

    // Style edges
    const edgePaths = svgElement.querySelectorAll('.edgePath path');
    edgePaths.forEach((path) => {
      (path as SVGElement).style.stroke = colors.borderColor;
      (path as SVGElement).style.strokeWidth = '2px';
    });

    // Style edge labels
    const edgeLabels = svgElement.querySelectorAll('.edgeLabel');
    edgeLabels.forEach((label) => {
      (label as HTMLElement).style.backgroundColor = colors.bgColor;
      (label as HTMLElement).style.color = colors.textColor;
    });

    // Apply custom styling to our enhanced node content if present
    const usernameElements = svgElement.querySelectorAll('.username');
    usernameElements.forEach((el) => {
      (el as HTMLElement).style.fontWeight = '700';
      (el as HTMLElement).style.fontSize = '15px';
      (el as HTMLElement).style.color = colors.primary;
    });

    const codeElements = svgElement.querySelectorAll('.code');
    codeElements.forEach((el) => {
      (el as HTMLElement).style.fontWeight = '500';
      (el as HTMLElement).style.fontSize = '12px';
      (el as HTMLElement).style.color = colors.descriptionColor;
    });

    // Style status badges
    const activeBadges = svgElement.querySelectorAll('.active-badge');
    activeBadges.forEach((el) => {
      (el as HTMLElement).style.color = colors.successColor;
    });

    const inactiveBadges = svgElement.querySelectorAll('.inactive-badge');
    inactiveBadges.forEach((el) => {
      (el as HTMLElement).style.color = colors.descriptionColor;
    });

    // Style eligibility badges
    const activeBadgeElements = svgElement.querySelectorAll('.eligibility-badge.active');
    activeBadgeElements.forEach((el) => {
      (el as HTMLElement).style.backgroundColor = colors.successColor;
      (el as HTMLElement).style.color = 'white';
      (el as HTMLElement).style.padding = '2px 6px';
      (el as HTMLElement).style.borderRadius = '4px';
      (el as HTMLElement).style.fontSize = '10px';
      (el as HTMLElement).style.fontWeight = '600';
    });

    const suspendedBadgeElements = svgElement.querySelectorAll('.eligibility-badge.suspended');
    suspendedBadgeElements.forEach((el) => {
      (el as HTMLElement).style.backgroundColor = colors.errorColor;
      (el as HTMLElement).style.color = 'white';
      (el as HTMLElement).style.padding = '2px 6px';
      (el as HTMLElement).style.borderRadius = '4px';
      (el as HTMLElement).style.fontSize = '10px';
      (el as HTMLElement).style.fontWeight = '600';
    });

    const reviewBadgeElements = svgElement.querySelectorAll('.eligibility-badge.under-review');
    reviewBadgeElements.forEach((el) => {
      (el as HTMLElement).style.backgroundColor = colors.warningColor;
      (el as HTMLElement).style.color = colors.textColor;
      (el as HTMLElement).style.padding = '2px 6px';
      (el as HTMLElement).style.borderRadius = '4px';
      (el as HTMLElement).style.fontSize = '10px';
      (el as HTMLElement).style.fontWeight = '600';
    });

    const referralCounts = svgElement.querySelectorAll('.referral-count');
    referralCounts.forEach((el) => {
      (el as HTMLElement).style.fontWeight = '600';
      (el as HTMLElement).style.fontSize = '11px';
    });
  }

  private addNodeInteractivity(svgElement: SVGSVGElement): void {
    const colors = this.getThemeColors();

    // Find all node elements
    const nodes = svgElement.querySelectorAll('.node');

    nodes.forEach((node) => {
      const nodeElement = node as SVGGElement;

      // Add pointer cursor
      nodeElement.style.cursor = 'pointer';

      // Add hover effects
      nodeElement.addEventListener('mouseenter', () => {
        const rect = nodeElement.querySelector('rect, circle, polygon');
        if (rect) {
          (rect as SVGElement).style.fill = colors.secondaryLight;
          (rect as SVGElement).style.stroke = colors.primary;
          (rect as SVGElement).style.strokeWidth = '2.5px';
          (rect as SVGElement).style.transition = 'all 0.2s';
        }
      });

      nodeElement.addEventListener('mouseleave', () => {
        const rect = nodeElement.querySelector('rect, circle, polygon');
        if (rect) {
          (rect as SVGElement).style.fill = colors.bgColor;
          (rect as SVGElement).style.stroke = colors.borderColor;
          (rect as SVGElement).style.strokeWidth = '2px';
        }
      });

      // Add click handler to show node details
      nodeElement.addEventListener('click', (event) => {
        event.stopPropagation();
        const labelElement = nodeElement.querySelector('.label, text, .nodeLabel');
        if (labelElement) {
          const nodeText = labelElement.textContent || '';
          this.messageService.info(`Selected: ${nodeText}`);
        }
      });
    });
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(200, this.zoomLevel + 10);
    this.applyZoom();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(50, this.zoomLevel - 10);
    this.applyZoom();
  }

  resetZoom(): void {
    this.zoomLevel = 100;
    this.applyZoom();
  }

  private applyZoom(): void {
    if (this.mermaidContainer) {
      const container = this.mermaidContainer.nativeElement;
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = `scale(${this.zoomLevel / 100})`;
        svgElement.style.transformOrigin = 'top left';
      }
    }
  }

  downloadGraph(): void {
    if (!this.graphData) {
      return;
    }

    const blob = new Blob([this.graphData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `affiliate-graph.${this.format === 'json' ? 'json' : 'txt'}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  close(): void {
    this.dialogRef.close();
  }
}
