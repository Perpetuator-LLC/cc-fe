# Frontend Integration Quick Reference

## 🎯 Primary Implementation (Simplest Approach)

### 1. Create Research Service

**File:** `src/services/research.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

const CREATE_RESEARCH_CHAIN = gql`
  mutation CreateResearchChain($podcastUuid: UUID!) {
    createResearchChain(podcastUuid: $podcastUuid) {
      success
      message
      jobs {
        id
        kind
        status
      }
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class ResearchService {
  constructor(private apollo: Apollo) {}

  createResearchChain(podcastUuid: string) {
    return this.apollo.mutate({
      mutation: CREATE_RESEARCH_CHAIN,
      variables: { podcastUuid }
    });
  }
}
```

### 2. Add Button to Podcast List Component

**Component:** `podcast-list.component.ts`

```typescript
constructor(
  private researchService: ResearchService,
  private snackBar: MatSnackBar
) {}

onResearchEpisode(podcast: any): void {
  this.researchService.createResearchChain(podcast.uuid).subscribe({
    next: (result: any) => {
      const response = result.data.createResearchChain;
      if (response.success) {
        this.snackBar.open(
          `Research started! ${response.jobs.length} jobs created.`,
          'OK',
          { duration: 5000 }
        );
      }
    },
    error: (error) => {
      this.snackBar.open('Failed to start research', 'Close', { duration: 5000 });
    }
  });
}
```

**Template:** `podcast-list.component.html`

```html
<button
  mat-raised-button
  color="accent"
  (click)="onResearchEpisode(podcast)"
>
  <mat-icon>science</mat-icon>
  Research Episode
</button>
```

---

## 📋 New Job Types to Add

Update your job type enum/constants:

```typescript
export const JOB_TYPES = {
  // ... existing types ...
  CREATE_RESEARCH_TOPIC: 'create_research_topic',
  RESEARCH_TOPIC: 'research_topic',
  VALIDATE_RESEARCH: 'validate_research',
  GENERATE_RESEARCH_TRANSCRIPT: 'generate_research_transcript'
};

export const JOB_LABELS = {
  // ... existing labels ...
  'create_research_topic': 'Create Research Topic',
  'research_topic': 'Research Topic',
  'validate_research': 'Validate Research',
  'generate_research_transcript': 'Generate Research Transcript'
};

export const JOB_ICONS = {
  // ... existing icons ...
  'create_research_topic': 'lightbulb',
  'research_topic': 'search',
  'validate_research': 'fact_check',
  'generate_research_transcript': 'description'
};
```

---

## 🔄 The Workflow

**User clicks "Research Episode" button** →

1. **Create Topic** - AI generates topic based on podcast prompt
2. **Research** - Conducts research, collects sources
3. **Validate** - Fact-checks all claims
4. **Generate Transcript** - Creates podcast transcript

All 4 jobs run automatically in sequence!

---

## 📡 GraphQL Response Structure

```typescript
interface CreateResearchChainResponse {
  createResearchChain: {
    success: boolean;
    message: string;
    jobs: Array<{
      id: string;
      kind: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
    }>;
  };
}
```

---

## ✅ Testing Checklist

1. ☐ Import ResearchService in module
2. ☐ Add service to component constructor
3. ☐ Add button to template
4. ☐ Test button click
5. ☐ Verify jobs appear in job tracking
6. ☐ Check job labels display correctly

---

## 🚀 That's It!

Just 3 files to modify:
1. Create `research.service.ts`
2. Update `podcast-list.component.ts`
3. Update `podcast-list.component.html`

The backend is ready and waiting for your GraphQL calls!

---

## 📚 Full Documentation

See `FRONTEND_INTEGRATION_GUIDE.md` for:
- Complete TypeScript interfaces
- All available queries and mutations
- Advanced features (view topics, update, delete)
- Error handling
- Styling suggestions
- Research topics page example

