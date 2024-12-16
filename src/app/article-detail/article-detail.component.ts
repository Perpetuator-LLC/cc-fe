import { Component, OnInit, TemplateRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Article, CryptoArticleService } from '../crypto-article.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { MatList, MatListItem } from '@angular/material/list';
import { MessageComponent } from '../message/message.component';
import { JobStatusBarComponent } from '../job-status-bar/job-status-bar.component';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatLine } from '@angular/material/core';
import { DatePipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { JobType, stringToJobType } from '../job.service';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [
    FormsModule,
    MatListItem,
    MessageComponent,
    MatList,
    JobStatusBarComponent,
    MatCardContent,
    MatCard,
    MatDivider,
    MatLabel,
    MatFormField,
    MatLine,
    DatePipe,
    MatTooltip,
    MatButton,
    MatInput,
    MatIcon,
    MatCheckbox,
    ReactiveFormsModule,
    RouterLink,
    MatAnchor,
  ],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  articleForm: FormGroup;
  audioSrc: string | null = null;
  downloadLink: string | null = null;
  wordCount = 0;

  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  @ViewChild(JobStatusBarComponent) jobStatusBar!: JobStatusBarComponent;
  private articleId: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private articleService: CryptoArticleService,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      throw new Error('Failed to get Article ID from route.');
    }
    this.articleId = id;
    this.articleForm = this.fb.group({
      id: [{ value: '', disabled: true }, Validators.required],
      isLive: [false, Validators.required],
      title: ['', Validators.required],
      content: ['', Validators.required],
      date: ['', Validators.required],
      audioBase64: ['', Validators.required],
      podcastDate: ['', Validators.required],
      telegramDate: ['', Validators.required],
      newsSummaries: this.fb.array([
        this.fb.group({
          id: [{ value: '', disabled: true }],
          url: [{ value: '', disabled: true }],
          title: [{ value: '', disabled: true }],
        }),
      ]),
      team: this.fb.group({
        id: [{ value: '', disabled: true }],
        name: [{ value: '', disabled: true }],
      }),
    });
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);

    this.subscriptions.add(
      this.articleService.getCryptoArticleById(this.articleId).subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          this.articleForm.patchValue(data.article);

          for (const newsSummary of data.article.newsSummaries) {
            (this.articleForm.get('newsSummaries') as FormArray).push(this.fb.group(newsSummary));
          }

          if (this.articleForm.value.audioBase64) {
            this.prepareAudioPlayer(this.articleForm.value.audioBase64);
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to fetch article: ${err.message}`);
        },
      }),
    );
    this.subscriptions.add(
      this.articleForm.get('content')?.valueChanges.subscribe((value: string) => {
        this.wordCount = this.countWords(value);
      }),
    );
  }

  private countWords(text: string): number {
    return text ? text.trim().split(/\s+/).length : 0;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  ngAfterViewInit() {
    this.subscriptions.add(
      this.jobStatusBar.jobCompleted$.subscribe((job) => {
        if ([JobType.UPDATE_CRYPTO_ARTICLE_AUDIO].includes(stringToJobType(job.jobType))) {
          this.subscriptions.add(
            this.articleService.getCryptoArticleById(this.articleId).subscribe({
              next: (data) => {
                if (data.success && data.article.audioBase64) {
                  this.prepareAudioPlayer(data.article.audioBase64);
                }
              },
              error: (err) => {
                this.messageService.error(`Failed to fetch updated audio for article: ${err.message}`);
              },
            }),
          );
        } else if ([JobType.CREATE_CRYPTO_ARTICLE].includes(stringToJobType(job.jobType))) {
          const newArticleUrl = `/crypto-article/${job.result}`;
          this.messageService.success(`New article URL: <a href="${newArticleUrl}">${newArticleUrl}</a>`, null, true);
        }
      }),
    );
  }

  prepareAudioPlayer(base64Audio: string): void {
    // Decode the base64 audio and create a Blob
    const byteCharacters = atob(base64Audio);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });

    // Create a URL for the Blob and set it to the audio source
    this.audioSrc = URL.createObjectURL(blob);
    this.downloadLink = this.audioSrc; // Also enable the download link
  }

  publishAudio(): void {
    this.messageService.info('Audio file publishing...');
    this.subscriptions.add(
      this.articleService.publishAudio(this.articleId).subscribe({
        next: (response) => {
          this.messageService.success('Audio file published successfully.');
          this.articleForm.patchValue(response.article);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  onIsLiveChange(isLive: boolean) {
    this.articleForm.value.isLive = isLive;
    this.updateArticle();
  }

  downloadAudio(): void {
    if (this.downloadLink) {
      const a = document.createElement('a');
      a.href = this.downloadLink;
      a.download = `crypto_article_${this.articleId}.mp3`; // Set the download file name
      a.click(); // Programmatically trigger the download
    }
  }

  generateAudio(): void {
    this.subscriptions.add(
      this.articleService.generateAudio(this.articleId).subscribe({
        next: (data) => {
          if (!data.success) {
            this.messageService.error(data.message);
            return;
          }
          if (!data.job) {
            this.messageService.error('No job returned for audio generation.');
            return;
          }
          this.messageService.info('Generating audio file...');
          this.jobStatusBar.addJob(data.job);
        },
        error: (err) => {
          this.messageService.error(err.message);
        },
      }),
    );
  }

  updateArticle(): void {
    const formValues = this.articleForm.getRawValue() as Article;
    this.subscriptions.add(
      this.articleService
        .updateArticle(formValues.id, formValues.title, formValues.content, formValues.isLive)
        .subscribe({
          next: (response) => {
            if (!response.success) {
              this.messageService.error(response.message);
              return;
            }
            this.messageService.success('Article updated successfully.');
            this.articleForm.patchValue(response.article);
          },
          error: (err) => {
            this.messageService.error(err.message);
          },
        }),
    );
  }
}
