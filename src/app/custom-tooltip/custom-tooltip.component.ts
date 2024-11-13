import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-custom-tooltip',
  standalone: true,
  imports: [],
  templateUrl: './custom-tooltip.component.html',
  styleUrl: './custom-tooltip.component.scss',
})
export class CustomTooltipComponent {
  @Input() text = '';
}
