// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { Subscription } from 'rxjs';
import { SocialsService, SocialPlatform } from '../socials.service';
import { TeamsService } from '../../team/teams.service';
import { MessageService } from '../../message.service';

interface Team {
  uuid: string;
  name: string | null;
}

export type TelegramMode = 'cc_bot' | 'custom_bot';

interface PlatformOption {
  value: SocialPlatform;
  label: string;
  icon: string;
  requiresApiKey: boolean;
  requiresToken: boolean;
  requiresChannelId: boolean;
  hasModes: boolean;
}

@Component({
  selector: 'app-connect-social-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
  ],
  templateUrl: './connect-social-dialog.component.html',
  styleUrl: './connect-social-dialog.component.scss',
})
export class ConnectSocialDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<ConnectSocialDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly socialsService = inject(SocialsService);
  private readonly teamsService = inject(TeamsService);
  private readonly messageService = inject(MessageService);

  private subscriptions = new Subscription();

  socialForm: FormGroup;
  teams: Team[] = [];
  loadingTeams = true;
  connecting = false;
  telegramMode: TelegramMode = 'cc_bot';

  readonly CC_BOT_USERNAME = '@capital_copilot_bot';

  readonly platforms: PlatformOption[] = [
    {
      value: 'TELEGRAM',
      label: 'Telegram',
      icon: 'send',
      requiresApiKey: false,
      requiresToken: false,
      requiresChannelId: true,
      hasModes: true,
    },
    {
      value: 'TWITTER',
      label: 'Twitter / X',
      icon: 'share',
      requiresApiKey: true,
      requiresToken: true,
      requiresChannelId: false,
      hasModes: false,
    },
    {
      value: 'LINKEDIN',
      label: 'LinkedIn',
      icon: 'work',
      requiresApiKey: false,
      requiresToken: true,
      requiresChannelId: false,
      hasModes: false,
    },
    {
      value: 'BLUESKY',
      label: 'Bluesky',
      icon: 'cloud',
      requiresApiKey: false,
      requiresToken: true,
      requiresChannelId: false,
      hasModes: false,
    },
    {
      value: 'THREADS',
      label: 'Threads',
      icon: 'forum',
      requiresApiKey: false,
      requiresToken: true,
      requiresChannelId: false,
      hasModes: false,
    },
    {
      value: 'FACEBOOK',
      label: 'Facebook',
      icon: 'facebook',
      requiresApiKey: false,
      requiresToken: true,
      requiresChannelId: false,
      hasModes: false,
    },
    {
      value: 'INSTAGRAM',
      label: 'Instagram',
      icon: 'photo_camera',
      requiresApiKey: false,
      requiresToken: true,
      requiresChannelId: false,
      hasModes: false,
    },
  ];

  constructor() {
    this.socialForm = this.fb.group({
      platform: ['', Validators.required],
      teamUuid: ['', Validators.required],
      accountName: ['', [Validators.required, Validators.minLength(2)]],
      platformUsername: [''],
      apiKey: [''],
      apiSecret: [''],
      accessToken: [''],
      channelId: [''],
    });

    // Update validators based on platform selection
    this.socialForm.get('platform')?.valueChanges.subscribe((platform) => {
      this.updateValidators(platform);
    });
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadTeams(): void {
    this.loadingTeams = true;
    this.subscriptions.add(
      this.teamsService.getTeams().subscribe({
        next: (result) => {
          this.teams = result.teams.map((t) => ({ uuid: t.uuid, name: t.name }));
          this.loadingTeams = false;
          // Auto-select if only one team
          if (this.teams.length === 1) {
            this.socialForm.patchValue({ teamUuid: this.teams[0].uuid });
          }
        },
        error: (err) => {
          this.messageService.error(`Failed to load teams: ${err.message}`);
          this.loadingTeams = false;
        },
      }),
    );
  }

  private updateValidators(platform: SocialPlatform): void {
    const selectedPlatform = this.platforms.find((p) => p.value === platform);
    const apiKeyControl = this.socialForm.get('apiKey');
    const apiSecretControl = this.socialForm.get('apiSecret');
    const accessTokenControl = this.socialForm.get('accessToken');
    const channelIdControl = this.socialForm.get('channelId');

    // Reset Telegram mode when switching platforms
    if (platform === 'TELEGRAM') {
      this.telegramMode = 'cc_bot';
    }

    if (selectedPlatform?.requiresApiKey) {
      apiKeyControl?.setValidators([Validators.required]);
      apiSecretControl?.setValidators([Validators.required]);
    } else {
      apiKeyControl?.clearValidators();
      apiSecretControl?.clearValidators();
    }

    if (selectedPlatform?.requiresToken && !(platform === 'TELEGRAM' && this.telegramMode === 'cc_bot')) {
      accessTokenControl?.setValidators([Validators.required]);
    } else {
      accessTokenControl?.clearValidators();
    }

    if (selectedPlatform?.requiresChannelId) {
      channelIdControl?.setValidators([Validators.required]);
    } else {
      channelIdControl?.clearValidators();
    }

    apiKeyControl?.updateValueAndValidity();
    apiSecretControl?.updateValueAndValidity();
    accessTokenControl?.updateValueAndValidity();
    channelIdControl?.updateValueAndValidity();
  }

  onTelegramModeChange(mode: TelegramMode): void {
    this.telegramMode = mode;
    const accessTokenControl = this.socialForm.get('accessToken');
    if (mode === 'cc_bot') {
      accessTokenControl?.clearValidators();
      accessTokenControl?.setValue('');
    } else {
      accessTokenControl?.setValidators([Validators.required]);
    }
    accessTokenControl?.updateValueAndValidity();
  }

  isTelegram(): boolean {
    return this.socialForm.get('platform')?.value === 'TELEGRAM';
  }

  getSelectedPlatform(): PlatformOption | undefined {
    return this.platforms.find((p) => p.value === this.socialForm.get('platform')?.value);
  }

  connectAccount(): void {
    if (this.socialForm.invalid || this.connecting) {
      return;
    }

    this.connecting = true;
    const { platform, teamUuid, accountName, platformUsername, apiKey, apiSecret, accessToken, channelId } =
      this.socialForm.value;

    this.subscriptions.add(
      this.socialsService
        .createSocialAccount(teamUuid, platform, accountName, {
          platformUsername: platformUsername || undefined,
          apiKey: apiKey || undefined,
          apiSecret: apiSecret || undefined,
          accessToken: accessToken || undefined,
          channelId: channelId || undefined,
        })
        .subscribe({
          next: (result) => {
            this.connecting = false;
            if (result.success && result.socialAccount) {
              this.messageService.success('Social account connected successfully!');
              this.dialogRef.close({ socialAccount: result.socialAccount });
            } else {
              this.messageService.error(result.message || 'Failed to connect social account');
            }
          },
          error: (err) => {
            this.connecting = false;
            this.messageService.error(`Failed to connect account: ${err.message}`);
          },
        }),
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
