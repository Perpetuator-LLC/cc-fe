import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { MatLine } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { SlicePipe } from '@angular/common';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MessageComponent } from '../message/message.component';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { CryptoArticleService } from '../crypto-article.service';

@Component({
  selector: 'app-articles-list',
  standalone: true,
  imports: [
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatList,
    MatListItem,
    MatIcon,
    RouterLink,
    MatLine,
    MatDivider,
    SlicePipe,
    MatFormField,
    MatInput,
    MatLabel,
    MessageComponent,
  ],
  templateUrl: './articles-list.component.html',
  styleUrl: './articles-list.component.scss',
})
export class ArticlesListComponent implements OnInit {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() articles: any[] = [];

  constructor(
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: CryptoArticleService,
  ) {}

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.articleService.getCryptoArticles().subscribe((response: any) => {
      if (response.success) {
        this.articles = response.results;
      }
    });
  }

  viewArticle(id: string) {
    this.router.navigate(['/crypto-article', id]);
  }
}
