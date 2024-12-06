import { AfterViewInit, Component, TemplateRef, ViewChild } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatToolbar, MatCard, MatCardHeader, MatCardContent, MatCardTitle, MatCardSubtitle, MatButton, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit {
  protected isLoggedIn = this.authService.isLoggedIn;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private toolbarService: ToolbarService,
    protected authService: AuthService,
  ) {}

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
  }
}
