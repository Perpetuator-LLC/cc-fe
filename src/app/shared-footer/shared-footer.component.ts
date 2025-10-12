// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-shared-footer',
  standalone: true,
  imports: [MatToolbarModule, RouterLink],
  templateUrl: './shared-footer.component.html',
  styleUrls: ['./shared-footer.component.scss'],
})
export class SharedFooterComponent {}
