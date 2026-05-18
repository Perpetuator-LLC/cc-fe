// Copyright (c) 2026 Perpetuator LLC
import { Component, OnInit, inject, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { marked } from 'marked';
import { PublicBlogHttpService, ArticleResponse } from '../public-blog-http.service';
import { ShareService } from '../share.service';
import { ShareButtonsComponent } from '../share-buttons/share-buttons.component';
import { MessageService } from '../message.service';
import { AuthService } from '../auth/auth.service';
import { SeoService } from '../seo.service';

@Component({
  selector: 'app-public-article-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ShareButtonsComponent,
  ],
  templateUrl: './public-article-page.component.html',
  styleUrl: './public-article-page.component.scss',
})
export class PublicArticlePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly publicBlogService = inject(PublicBlogHttpService);
  private readonly shareService = inject(ShareService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly seoService = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);

  articleData: ArticleResponse | null = null;
  loading = true;
  error = false;
  articleId = '';
  isAuthenticated = false;

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isLoggedIn();

    this.route.params.subscribe((params) => {
      const idParam = params['id'];
      this.articleId = this.shareService.extractIdFromSlugParam(idParam);
      this.loadArticle();
    });
  }

  loadArticle(): void {
    this.loading = true;
    this.error = false;

    this.publicBlogService.getArticle(this.articleId).subscribe({
      next: (data) => {
        this.articleData = data;
        this.loading = false;
        this.updateSeoTags();
      },
      error: (err) => {
        console.error('[PublicArticlePage] Failed to load article:', err);
        this.error = true;
        this.loading = false;
        this.messageService.error(`Failed to load article: ${err.status} ${err.statusText || err.message}`);
      },
    });
  }

  getShareUrl(): string {
    if (!this.articleData) return '';
    return this.shareService.buildArticleUrl(this.articleData.id, this.articleData.title);
  }

  getBlogUrl(): string {
    if (!this.articleData?.blogId) {
      return '';
    }
    return this.shareService.buildBlogRoute(this.articleData.blogId, this.articleData.blogName);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  renderMarkdown(markdown: string | undefined): SafeHtml {
    if (!markdown) return '';
    const html = marked.parse(markdown, { async: false }) as string;
    // Sanitize the HTML to prevent XSS
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }

  private updateSeoTags(): void {
    if (!this.articleData) return;

    const shareUrl = this.getShareUrl();
    const description =
      this.articleData.description ||
      this.articleData.excerpt ||
      `Read ${this.articleData.title} on ${this.articleData.blogName}`;

    this.seoService.updateTags({
      title: `${this.articleData.title} | ${this.articleData.blogName} | Capital Copilot`,
      description,
      image: this.articleData.blog?.imageUrl || this.articleData.blog?.thumbnailUrl,
      url: shareUrl,
      type: 'article',
      author: this.articleData.blogName,
      publishedTime: this.articleData.publishedAt || this.articleData.createdAt,
    });
  }
}
