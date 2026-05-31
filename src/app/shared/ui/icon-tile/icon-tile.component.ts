// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type IconTileVariant = 'primary' | 'tertiary' | 'success' | 'warning' | 'error' | 'info' | 'surface';
export type IconTileSize = 'medium' | 'large';

@Component({
  selector: 'app-icon-tile',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './icon-tile.component.html',
  styleUrl: './icon-tile.component.scss',
})
export class IconTileComponent {
  @Input() icon = '';
  @Input() variant: IconTileVariant = 'primary';
  @Input() size: IconTileSize = 'medium';
}
