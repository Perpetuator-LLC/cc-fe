// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { SocialsService } from './socials.service';

describe('SocialsService', () => {
  let service: SocialsService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    TestBed.configureTestingModule({
      providers: [SocialsService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(SocialsService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // Helpers ------------------------------------------------------------------
  function queryReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.query.and.returnValue(of({ data: payload } as any));
  }
  function mutationReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.mutate.and.returnValue(of({ data: payload } as any));
  }
  function lastQueryVars(): Record<string, unknown> {
    return (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
  }
  function lastMutationVars(): Record<string, unknown> {
    return (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
  }

  // --- Queries -------------------------------------------------------------

  describe('queries', () => {
    it('getSupportedPlatforms unwraps array (or empty)', (done) => {
      queryReturns({ supportedPlatforms: ['twitter', 'linkedin'] });
      service.getSupportedPlatforms().subscribe((result) => {
        expect(result).toEqual(['twitter', 'linkedin']);
        // Also test fallback
        queryReturns({});
        service.getSupportedPlatforms().subscribe((empty) => {
          expect(empty).toEqual([]);
          done();
        });
      });
    });

    it('getSocialAccounts forwards filters and unwraps array', (done) => {
      queryReturns({ socialAccounts: [{ id: 'a1' }] });
      service.getSocialAccounts('team', 'twitter', true).subscribe((result) => {
        expect(result.length).toBe(1);
        expect(lastQueryVars()).toEqual({ teamUuid: 'team', platform: 'twitter', isActive: true });
        done();
      });
    });

    it('getSocialAccounts returns [] when no data', (done) => {
      queryReturns({});
      service.getSocialAccounts().subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('getSocialAccount throws when missing', (done) => {
      queryReturns({});
      service.getSocialAccount('a1').subscribe({
        error: (err) => {
          expect(err.message).toContain('Social account not found');
          done();
        },
      });
    });

    it('getSocialAccount returns payload', (done) => {
      queryReturns({ socialAccount: { id: 'a1' } });
      service.getSocialAccount('a1').subscribe((result) => {
        expect(result.id).toBe('a1');
        done();
      });
    });

    it('getBroadcasts forwards filters and unwraps array', (done) => {
      queryReturns({ broadcasts: [{ id: 'b1' }] });
      service.getBroadcasts('acct', 'PUBLISHED', 5).subscribe((result) => {
        expect(result.length).toBe(1);
        expect(lastQueryVars()).toEqual({ socialAccountUuid: 'acct', status: 'PUBLISHED', limit: 5 });
        done();
      });
    });

    it('getBroadcasts returns [] when no data', (done) => {
      queryReturns({});
      service.getBroadcasts().subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('getBroadcast throws when missing', (done) => {
      queryReturns({});
      service.getBroadcast('b1').subscribe({
        error: (err) => {
          expect(err.message).toContain('Broadcast not found');
          done();
        },
      });
    });

    it('getBroadcast returns payload', (done) => {
      queryReturns({ broadcast: { id: 'b1' } });
      service.getBroadcast('b1').subscribe((result) => {
        expect(result.id).toBe('b1');
        done();
      });
    });

    it('getBroadcastsForSource forwards source filters', (done) => {
      queryReturns({ broadcastsForSource: [{ id: 'b1' }] });
      service.getBroadcastsForSource('episode', 'e1').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(lastQueryVars()).toEqual({ sourceType: 'episode', sourceUuid: 'e1' });
        done();
      });
    });

    it('getBroadcastsForSource returns [] when no data', (done) => {
      queryReturns({});
      service.getBroadcastsForSource('episode', 'e1').subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('getBroadcastTemplates unwraps array (or empty)', (done) => {
      queryReturns({ broadcastTemplates: [{ id: 'tpl' }] });
      service.getBroadcastTemplates('team', 'twitter').subscribe((result) => {
        expect(result.length).toBe(1);
        queryReturns({});
        service.getBroadcastTemplates().subscribe((empty) => {
          expect(empty).toEqual([]);
          done();
        });
      });
    });
  });

  // --- Mutations -----------------------------------------------------------

  describe('mutations', () => {
    it('createSocialAccount passes optional fields', (done) => {
      mutationReturns({ createSocialAccount: { success: true } });
      service
        .createSocialAccount('team', 'twitter', 'Acct', { accessToken: 'tok', channelId: 'chan' })
        .subscribe((result) => {
          expect(result.success).toBeTrue();
          expect(lastMutationVars()).toEqual({
            teamUuid: 'team',
            platform: 'twitter',
            accountName: 'Acct',
            accessToken: 'tok',
            channelId: 'chan',
          });
          done();
        });
    });

    it('createSocialAccount throws when response missing', (done) => {
      mutationReturns({});
      service.createSocialAccount('t', 'p', 'a').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to create social account');
          done();
        },
      });
    });

    it('updateSocialAccount merges updates into variables', (done) => {
      mutationReturns({ updateSocialAccount: { success: true } });
      service.updateSocialAccount('a1', { isActive: false, defaultHashtags: ['#fin'] }).subscribe(() => {
        expect(lastMutationVars()).toEqual({
          accountUuid: 'a1',
          isActive: false,
          defaultHashtags: ['#fin'],
        });
        done();
      });
    });

    it('updateSocialAccount throws when response missing', (done) => {
      mutationReturns({});
      service.updateSocialAccount('a1', {}).subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to update social account');
          done();
        },
      });
    });

    it('deleteSocialAccount works on success and error paths', (done) => {
      mutationReturns({ deleteSocialAccount: { success: true } });
      service.deleteSocialAccount('a1').subscribe((res) => {
        expect(res.success).toBeTrue();
        mutationReturns({});
        service.deleteSocialAccount('a1').subscribe({
          error: (err) => {
            expect(err.message).toContain('Failed to delete social account');
            done();
          },
        });
      });
    });

    it('verifySocialAccount works on success and error paths', (done) => {
      mutationReturns({ verifySocialAccount: { success: true } });
      service.verifySocialAccount('a1').subscribe((res) => {
        expect(res.success).toBeTrue();
        mutationReturns({});
        service.verifySocialAccount('a1').subscribe({
          error: (err) => {
            expect(err.message).toContain('Failed to verify social account');
            done();
          },
        });
      });
    });

    it('createBroadcast handles full options block', (done) => {
      mutationReturns({ createBroadcast: { success: true } });
      service
        .createBroadcast('acct', 'hello world', {
          contentType: 'TEXT',
          linkUrl: 'https://x.com',
          hashtags: ['#a'],
          mediaUrls: ['m1'],
          scheduledAt: '2026-12-31',
          sourceType: 'episode',
          sourceUuid: 'e1',
        })
        .subscribe(() => {
          const vars = lastMutationVars();
          expect(vars['contentType']).toBe('TEXT');
          expect(vars['hashtags']).toEqual(['#a']);
          done();
        });
    });

    it('createBroadcast throws when response missing', (done) => {
      mutationReturns({});
      service.createBroadcast('a', 't').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to create broadcast');
          done();
        },
      });
    });

    it('updateBroadcast merges updates', (done) => {
      mutationReturns({ updateBroadcast: { success: true } });
      service.updateBroadcast('b1', { text: 'new' }).subscribe(() => {
        expect(lastMutationVars()).toEqual({ broadcastUuid: 'b1', text: 'new' });
        done();
      });
    });

    it('updateBroadcast throws when response missing', (done) => {
      mutationReturns({});
      service.updateBroadcast('b1', { text: 'x' }).subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to update broadcast');
          done();
        },
      });
    });

    it('publishBroadcast works on success and error paths', (done) => {
      mutationReturns({ publishBroadcast: { success: true } });
      service.publishBroadcast('b1').subscribe((res) => {
        expect(res.success).toBeTrue();
        mutationReturns({});
        service.publishBroadcast('b1').subscribe({
          error: (err) => {
            expect(err.message).toContain('Failed to publish broadcast');
            done();
          },
        });
      });
    });

    it('deleteBroadcast works on success and error paths', (done) => {
      mutationReturns({ deleteBroadcast: { success: true } });
      service.deleteBroadcast('b1').subscribe((res) => {
        expect(res.success).toBeTrue();
        mutationReturns({});
        service.deleteBroadcast('b1').subscribe({
          error: (err) => {
            expect(err.message).toContain('Failed to delete broadcast');
            done();
          },
        });
      });
    });

    it('generateBroadcastFromSource forwards all params (incl. templateUuid)', (done) => {
      mutationReturns({ generateBroadcastFromSource: { success: true } });
      service.generateBroadcastFromSource('acct', 'episode', 'e1', 'tpl').subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(lastMutationVars()).toEqual({
          socialAccountUuid: 'acct',
          sourceType: 'episode',
          sourceUuid: 'e1',
          templateUuid: 'tpl',
        });
        done();
      });
    });

    it('generateBroadcastFromSource throws when response missing', (done) => {
      mutationReturns({});
      service.generateBroadcastFromSource('a', 'e', 'u').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to generate broadcast');
          done();
        },
      });
    });
  });
});
