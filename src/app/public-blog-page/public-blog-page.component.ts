// Copyright (c) 2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PublicBlogHttpService, BlogResponse, PublicArticle } from '../public-blog-http.service';
import { ShareService } from '../share.service';
import { ShareButtonsComponent } from '../share-buttons/share-buttons.component';
import { MessageService } from '../message.service';
import { AuthService } from '../auth/auth.service';
import { SeoService } from '../seo.service';

@Component({
  selector: 'app-public-blog-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    ShareButtonsComponent,
  ],
  templateUrl: './public-blog-page.component.html',
  styleUrl: './public-blog-page.component.scss',
})
export class PublicBlogPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publicBlogService = inject(PublicBlogHttpService);
  private readonly shareService = inject(ShareService);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly seoService = inject(SeoService);

  blogData: BlogResponse | null = null;
  /**
   * Pre-enriched articles for the template. `readTimeText` is pre-formatted
   * (empty string when no read time) so the template can use
   * `[hidden]="!readTimeText"` instead of an `@if` — needed to keep the
   * template's cyclomatic complexity under the lint limit.
   */
  articlesDisplay: (PublicArticle & {
    url: string;
    shareUrl: string;
    formattedDate: string;
    excerpt: string;
    readTimeText: string;
  })[] = [];
  loading = true;
  error = false;
  blogId = '';
  currentPage = 1;
  perPage = 20;
  isAuthenticated = false;

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isLoggedIn();

    this.route.params.subscribe((params) => {
      const idParam = params['id'];
      this.blogId = this.shareService.extractIdFromSlugParam(idParam);
      this.loadBlog();
    });

    this.route.queryParams.subscribe((params) => {
      const page = params['page'];
      if (page) {
        this.currentPage = parseInt(page, 10);
      }
    });
  }

  loadBlog(): void {
    this.loading = true;
    this.error = false;

    this.publicBlogService.getBlog(this.blogId, this.currentPage, this.perPage).subscribe({
      next: (data) => {
        this.blogData = data;
        this.articlesDisplay = (data.articles || []).map((a) => ({
          ...a,
          url: this.getArticleUrl(a.id, a.title),
          shareUrl: this.getArticleShareUrl(a.id, a.title),
          formattedDate: a.publishedAt ? this.formatDate(a.publishedAt ?? a.createdAt) : '',
          excerpt: this.getExcerpt(a),
          readTimeText: a.readTimeMinutes ? `${a.readTimeMinutes} min read` : '',
        }));
        this.loading = false;
        this.updateSeoTags();
      },
      error: (err) => {
        console.error('[PublicBlogPage] Failed to load blog:', err);
        this.error = true;
        this.loading = false;
        this.messageService.error(`Failed to load blog: ${err.status} ${err.statusText || err.message}`);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.perPage = event.pageSize;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.currentPage },
      queryParamsHandling: 'merge',
    });
    this.loadBlog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get shareUrl(): string {
    if (!this.blogData) return '';
    return this.shareService.buildBlogUrl(this.blogData.id, this.blogData.name);
  }

  /** Preferred blog image: thumbnail if present, otherwise the full image. */
  get blogImageUrl(): string {
    return this.blogData?.thumbnailUrl || this.blogData?.imageUrl || '';
  }

  /** Backwards-compatible method kept for internal callers. */
  getShareUrl(): string {
    return this.shareUrl;
  }

  getArticleUrl(articleId: string, title: string): string {
    return this.shareService.buildArticleRoute(articleId, title);
  }

  getArticleShareUrl(articleId: string, title: string): string {
    return this.shareService.buildArticleUrl(articleId, title);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getExcerpt(article: PublicArticle): string {
    if (article.excerpt) return article.excerpt;
    if (article.description) return article.description;
    if (article.content) {
      // Take first 150 characters of content
      const text = article.content.replace(/[#*_`]/g, '').trim();
      return text.length > 150 ? text.substring(0, 150) + '...' : text;
    }
    return '';
  }

  private updateSeoTags(): void {
    if (!this.blogData) return;

    const shareUrl = this.getShareUrl();
    const description = this.blogData.description || `Read articles from ${this.blogData.name}`;

    this.seoService.updateTags({
      title: `${this.blogData.name} | Capital Copilot`,
      description,
      image: this.blogData.imageUrl || this.blogData.thumbnailUrl,
      url: shareUrl,
      type: 'website',
    });
  }
}
