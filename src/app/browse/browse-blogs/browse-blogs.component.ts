// Copyright (c) 2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicBlogHttpService, PublicBlog } from '../../public-blog-http.service';
import { ShareService } from '../../share.service';
import { ShareButtonsComponent } from '../../share-buttons/share-buttons.component';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-browse-blogs',
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
  templateUrl: './browse-blogs.component.html',
  styleUrl: './browse-blogs.component.scss',
})
export class BrowseBlogsComponent implements OnInit {
  private readonly publicBlogService = inject(PublicBlogHttpService);
  private readonly shareService = inject(ShareService);
  private readonly messageService = inject(MessageService);

  /** Pre-enriched blogs with url + shareUrl per row. */
  blogs: (PublicBlog & { url: string; shareUrl: string })[] = [];
  loading = true;
  limit = 20;

  ngOnInit(): void {
    this.loadBlogs();
  }

  loadBlogs(): void {
    this.loading = true;

    this.publicBlogService.getBlogs(this.limit).subscribe({
      next: (data) => {
        console.log('[BrowseBlogs] API response:', data);
        this.blogs = data.blogs.map((b) => ({
          ...b,
          url: this.getBlogUrl(b),
          shareUrl: this.getShareUrl(b),
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('[BrowseBlogs] Failed to load blogs:', err);
        this.loading = false;
        this.messageService.error(`Failed to load blogs: ${err.status} ${err.statusText || err.message}`);
      },
    });
  }

  getBlogUrl(blog: PublicBlog): string {
    return this.shareService.buildBlogRoute(blog.id, blog.name);
  }

  getShareUrl(blog: PublicBlog): string {
    return this.shareService.buildBlogUrl(blog.id, blog.name);
  }
}
