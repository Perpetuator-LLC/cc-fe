# Frontend Integration Guide - Research Feature

## Overview
This guide provides all the information needed to integrate the new Research feature into the frontend application. The research feature allows users to generate AI-researched podcast episodes based on the podcast's prompt/brand.

---

## Backend GraphQL API Reference

### New Job Types
Four new job types have been added to `JobKind` enum:
- `CREATE_RESEARCH_TOPIC` - "Create Research Topic"
- `RESEARCH_TOPIC` - "Research Topic"
- `VALIDATE_RESEARCH` - "Validate Research"
- `GENERATE_RESEARCH_TRANSCRIPT` - "Generate Research Transcript"

These will appear in job status tracking alongside existing job types.

---

## GraphQL Queries

### Query Topics
```graphql
query GetTopics($podcastUuid: UUID) {
  topics(podcast_Uuid: $podcastUuid) {
    edges {
      node {
        uuid
        title
        description
        researchContent
        validatedContent
        transcript
        createdAt
        updatedAt
        podcast {
          uuid
          name
        }
        sources {
          uuid
          title
          url
          content
          createdAt
        }
      }
    }
  }
}
```

**Variables:**
```json
{
  "podcastUuid": "abc-123-def-456"
}
```

**Response Structure:**
```typescript
interface TopicsResponse {
  topics: {
    edges: Array<{
      node: Topic
    }>
  }
}

interface Topic {
  uuid: string
  title: string
  description: string | null
  researchContent: string | null
  validatedContent: string | null
  transcript: string | null
  createdAt: string
  updatedAt: string
  podcast: {
    uuid: string
    name: string
  }
  sources: Source[]
}

interface Source {
  uuid: string
  title: string | null
  url: string
  content: string | null
  createdAt: string
}
```

---

## GraphQL Mutations

### 1. Create Research Chain (RECOMMENDED - Single Button Click)
This is the **primary mutation** to use for the "Research Episode" button. It executes the entire workflow.

```graphql
mutation CreateResearchChain($podcastUuid: UUID!) {
  createResearchChain(podcastUuid: $podcastUuid) {
    success
    message
    jobs {
      id
      kind
      status
      args
      error
      result
      createdAt
      updatedAt
    }
  }
}
```

**Variables:**
```json
{
  "podcastUuid": "abc-123-def-456"
}
```

**Response Structure:**
```typescript
interface CreateResearchChainResponse {
  createResearchChain: {
    success: boolean
    message: string
    jobs: Job[]
  }
}

interface Job {
  id: string
  kind: string // JobKind enum value
  status: string // "pending" | "running" | "completed" | "failed"
  args: Record<string, any>
  error: string | null
  result: string | null
  createdAt: string
  updatedAt: string
}
```

---

### 2. Individual Step Mutations (Optional - For Advanced UI)

#### Create Topic Only
```graphql
mutation CreateResearchTopic($podcastUuid: UUID!) {
  createResearchTopic(podcastUuid: $podcastUuid) {
    success
    message
    job {
      id
      kind
      status
    }
  }
}
```

#### Research Topic
```graphql
mutation ResearchTopic($topicUuid: UUID!) {
  researchTopic(topicUuid: $topicUuid) {
    success
    message
    job {
      id
      kind
      status
    }
  }
}
```

#### Validate Research
```graphql
mutation ValidateResearch($topicUuid: UUID!) {
  validateResearch(topicUuid: $topicUuid) {
    success
    message
    job {
      id
      kind
      status
    }
  }
}
```

#### Generate Transcript
```graphql
mutation GenerateResearchTranscript($topicUuid: UUID!) {
  generateResearchTranscript(topicUuid: $topicUuid) {
    success
    message
    job {
      id
      kind
      status
    }
  }
}
```

#### Update Topic
```graphql
mutation UpdateTopic(
  $topicUuid: UUID!
  $title: String
  $description: String
  $researchContent: String
  $validatedContent: String
  $transcript: String
) {
  updateTopic(
    topicUuid: $topicUuid
    title: $title
    description: $description
    researchContent: $researchContent
    validatedContent: $validatedContent
    transcript: $transcript
  ) {
    success
    message
    topic {
      uuid
      title
      description
    }
  }
}
```

#### Delete Topic
```graphql
mutation DeleteTopic($topicUuid: UUID!) {
  deleteTopic(topicUuid: $topicUuid) {
    success
    message
    topicUuid
  }
}
```

---

## Frontend Service Implementation

### File: `src/services/research.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Types
export interface Topic {
  uuid: string;
  title: string;
  description: string | null;
  researchContent: string | null;
  validatedContent: string | null;
  transcript: string | null;
  createdAt: string;
  updatedAt: string;
  podcast: {
    uuid: string;
    name: string;
  };
  sources: Source[];
}

export interface Source {
  uuid: string;
  title: string | null;
  url: string;
  content: string | null;
  createdAt: string;
}

export interface Job {
  id: string;
  kind: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  args: Record<string, any>;
  error: string | null;
  result: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MutationResponse {
  success: boolean;
  message: string;
}

// GraphQL Queries
const GET_TOPICS = gql`
  query GetTopics($podcastUuid: UUID) {
    topics(podcast_Uuid: $podcastUuid) {
      edges {
        node {
          uuid
          title
          description
          researchContent
          validatedContent
          transcript
          createdAt
          updatedAt
          podcast {
            uuid
            name
          }
          sources {
            uuid
            title
            url
            content
            createdAt
          }
        }
      }
    }
  }
`;

// GraphQL Mutations
const CREATE_RESEARCH_CHAIN = gql`
  mutation CreateResearchChain($podcastUuid: UUID!) {
    createResearchChain(podcastUuid: $podcastUuid) {
      success
      message
      jobs {
        id
        kind
        status
        args
        error
        result
        createdAt
        updatedAt
      }
    }
  }
`;

const CREATE_RESEARCH_TOPIC = gql`
  mutation CreateResearchTopic($podcastUuid: UUID!) {
    createResearchTopic(podcastUuid: $podcastUuid) {
      success
      message
      job {
        id
        kind
        status
      }
    }
  }
`;

const UPDATE_TOPIC = gql`
  mutation UpdateTopic(
    $topicUuid: UUID!
    $title: String
    $description: String
    $researchContent: String
    $validatedContent: String
    $transcript: String
  ) {
    updateTopic(
      topicUuid: $topicUuid
      title: $title
      description: $description
      researchContent: $researchContent
      validatedContent: $validatedContent
      transcript: $transcript
    ) {
      success
      message
      topic {
        uuid
        title
        description
        researchContent
        validatedContent
        transcript
      }
    }
  }
`;

const DELETE_TOPIC = gql`
  mutation DeleteTopic($topicUuid: UUID!) {
    deleteTopic(topicUuid: $topicUuid) {
      success
      message
      topicUuid
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class ResearchService {
  constructor(private apollo: Apollo) {}

  /**
   * Get all topics for a podcast
   */
  getTopics(podcastUuid?: string): Observable<Topic[]> {
    return this.apollo
      .watchQuery<any>({
        query: GET_TOPICS,
        variables: { podcastUuid },
        fetchPolicy: 'network-only'
      })
      .valueChanges.pipe(
        map(result => result.data.topics.edges.map((edge: any) => edge.node))
      );
  }

  /**
   * Create a full research chain (topic -> research -> validate -> transcript)
   * THIS IS THE PRIMARY METHOD FOR THE "RESEARCH EPISODE" BUTTON
   */
  createResearchChain(podcastUuid: string): Observable<{ success: boolean; message: string; jobs: Job[] }> {
    return this.apollo
      .mutate<any>({
        mutation: CREATE_RESEARCH_CHAIN,
        variables: { podcastUuid }
      })
      .pipe(
        map(result => result.data.createResearchChain)
      );
  }

  /**
   * Create a research topic only (first step)
   */
  createResearchTopic(podcastUuid: string): Observable<{ success: boolean; message: string; job: Job }> {
    return this.apollo
      .mutate<any>({
        mutation: CREATE_RESEARCH_TOPIC,
        variables: { podcastUuid }
      })
      .pipe(
        map(result => result.data.createResearchTopic)
      );
  }

  /**
   * Update topic fields
   */
  updateTopic(
    topicUuid: string,
    updates: {
      title?: string;
      description?: string;
      researchContent?: string;
      validatedContent?: string;
      transcript?: string;
    }
  ): Observable<{ success: boolean; message: string; topic: Topic }> {
    return this.apollo
      .mutate<any>({
        mutation: UPDATE_TOPIC,
        variables: { topicUuid, ...updates }
      })
      .pipe(
        map(result => result.data.updateTopic)
      );
  }

  /**
   * Delete a topic
   */
  deleteTopic(topicUuid: string): Observable<{ success: boolean; message: string; topicUuid: string }> {
    return this.apollo
      .mutate<any>({
        mutation: DELETE_TOPIC,
        variables: { topicUuid }
      })
      .pipe(
        map(result => result.data.deleteTopic)
      );
  }
}
```

---

## Component Implementation

### File: `src/app/podcasts/podcast-list/podcast-list.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { ResearchService } from '../../services/research.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-podcast-list',
  templateUrl: './podcast-list.component.html',
  styleUrls: ['./podcast-list.component.scss']
})
export class PodcastListComponent implements OnInit {
  podcasts: any[] = []; // Your existing podcast array
  loadingResearch: { [podcastUuid: string]: boolean } = {};

  constructor(
    private researchService: ResearchService,
    private snackBar: MatSnackBar
    // ... your existing services
  ) {}

  ngOnInit(): void {
    // Your existing initialization
  }

  /**
   * Handle "Research Episode" button click
   * This creates a full research chain for the podcast
   */
  onResearchEpisode(podcast: any): void {
    const podcastUuid = podcast.uuid || podcast.id;
    
    // Prevent multiple clicks
    if (this.loadingResearch[podcastUuid]) {
      return;
    }

    // Show loading state
    this.loadingResearch[podcastUuid] = true;

    // Call the research service
    this.researchService.createResearchChain(podcastUuid).subscribe({
      next: (response) => {
        this.loadingResearch[podcastUuid] = false;
        
        if (response.success) {
          // Success notification
          this.snackBar.open(
            `Research started! ${response.jobs.length} jobs created.`,
            'View Jobs',
            {
              duration: 5000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            }
          ).onAction().subscribe(() => {
            // Navigate to jobs page or open jobs panel
            // this.router.navigate(['/jobs']);
          });

          // Optional: Refresh podcast data or navigate to research page
          // this.loadPodcasts();
        } else {
          this.snackBar.open(
            `Failed: ${response.message}`,
            'Close',
            { duration: 5000 }
          );
        }
      },
      error: (error) => {
        this.loadingResearch[podcastUuid] = false;
        console.error('Research error:', error);
        
        this.snackBar.open(
          'Failed to start research. Please try again.',
          'Close',
          { duration: 5000 }
        );
      }
    });
  }

  /**
   * Check if research is currently loading for a podcast
   */
  isResearchLoading(podcast: any): boolean {
    const podcastUuid = podcast.uuid || podcast.id;
    return this.loadingResearch[podcastUuid] || false;
  }
}
```

---

## Template Implementation

### File: `src/app/podcasts/podcast-list/podcast-list.component.html`

Add this button to your podcast list table row (adjust selectors based on your existing structure):

```html
<!-- Option 1: Material Table -->
<table mat-table [dataSource]="podcasts" class="mat-elevation-z8">
  <!-- ... existing columns ... -->

  <!-- Actions Column -->
  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef>Actions</th>
    <td mat-cell *matCellDef="let podcast">
      <!-- Existing action buttons -->
      <button mat-icon-button [matMenuTriggerFor]="menu">
        <mat-icon>more_vert</mat-icon>
      </button>
      
      <!-- Research Episode Button -->
      <button
        mat-raised-button
        color="accent"
        (click)="onResearchEpisode(podcast)"
        [disabled]="isResearchLoading(podcast)"
        matTooltip="Generate AI-researched episode based on podcast prompt"
      >
        <mat-icon *ngIf="!isResearchLoading(podcast)">science</mat-icon>
        <mat-spinner
          *ngIf="isResearchLoading(podcast)"
          diameter="20"
          style="display: inline-block;"
        ></mat-spinner>
        Research Episode
      </button>

      <!-- Dropdown Menu -->
      <mat-menu #menu="matMenu">
        <!-- Your existing menu items -->
        <button mat-menu-item (click)="onResearchEpisode(podcast)">
          <mat-icon>science</mat-icon>
          <span>Research Episode</span>
        </button>
      </mat-menu>
    </td>
  </ng-container>
</table>

<!-- Option 2: Card Layout -->
<div class="podcast-card" *ngFor="let podcast of podcasts">
  <!-- ... existing card content ... -->
  
  <div class="card-actions">
    <!-- Existing buttons -->
    
    <button
      mat-raised-button
      color="accent"
      (click)="onResearchEpisode(podcast)"
      [disabled]="isResearchLoading(podcast)"
    >
      <mat-icon *ngIf="!isResearchLoading(podcast)">science</mat-icon>
      <mat-spinner
        *ngIf="isResearchLoading(podcast)"
        diameter="20"
      ></mat-spinner>
      Research Episode
    </button>
  </div>
</div>
```

---

## Job Status Tracking

### Update Job Kind Enum (if you have one in frontend)

```typescript
// File: src/app/models/job.model.ts or similar

export enum JobKind {
  // ... existing job kinds ...
  CREATE_RESEARCH_TOPIC = 'create_research_topic',
  RESEARCH_TOPIC = 'research_topic',
  VALIDATE_RESEARCH = 'validate_research',
  GENERATE_RESEARCH_TRANSCRIPT = 'generate_research_transcript'
}

// Job kind display names
export const JOB_KIND_LABELS: Record<string, string> = {
  // ... existing labels ...
  [JobKind.CREATE_RESEARCH_TOPIC]: 'Create Research Topic',
  [JobKind.RESEARCH_TOPIC]: 'Research Topic',
  [JobKind.VALIDATE_RESEARCH]: 'Validate Research',
  [JobKind.GENERATE_RESEARCH_TRANSCRIPT]: 'Generate Research Transcript'
};

// Job kind icons (Material Icons)
export const JOB_KIND_ICONS: Record<string, string> = {
  // ... existing icons ...
  [JobKind.CREATE_RESEARCH_TOPIC]: 'lightbulb',
  [JobKind.RESEARCH_TOPIC]: 'search',
  [JobKind.VALIDATE_RESEARCH]: 'fact_check',
  [JobKind.GENERATE_RESEARCH_TRANSCRIPT]: 'description'
};
```

---

## Module Registration

### File: `src/app/app.module.ts` or feature module

```typescript
import { ResearchService } from './services/research.service';

@NgModule({
  // ...
  providers: [
    ResearchService,
    // ... existing providers
  ]
})
export class AppModule { }
```

---

## Styling Suggestions

### File: `podcast-list.component.scss`

```scss
.research-button {
  margin-left: 8px;
  
  mat-icon {
    margin-right: 4px;
  }
  
  mat-spinner {
    margin-right: 8px;
  }
}

.loading-overlay {
  pointer-events: none;
  opacity: 0.6;
}

// Status badges for jobs
.job-status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  
  &.pending {
    background-color: #ffd54f;
    color: #000;
  }
  
  &.running {
    background-color: #42a5f5;
    color: #fff;
  }
  
  &.completed {
    background-color: #66bb6a;
    color: #fff;
  }
  
  &.failed {
    background-color: #ef5350;
    color: #fff;
  }
}
```

---

## Workflow Explanation

When a user clicks "Research Episode":

1. **Frontend** calls `researchService.createResearchChain(podcastUuid)`
2. **Backend** creates 4 jobs and chains them together:
   - Job 1: Create Research Topic (uses podcast prompt to generate topic)
   - Job 2: Research Topic (conducts research, collects sources)
   - Job 3: Validate Research (fact-checks all claims)
   - Job 4: Generate Transcript (creates podcast transcript)
3. **Jobs** execute sequentially via Celery task chains
4. **Frontend** can poll job status or listen to real-time updates
5. **User** can view results in topics list or episode editor

---

## Error Handling

### Common Errors and Solutions

1. **Insufficient Credits**
   - Error: User doesn't have enough credits
   - Solution: Display credit balance, link to purchase page

2. **Permission Denied**
   - Error: User isn't an editor for the podcast's team
   - Solution: Show permission error, hide button for non-editors

3. **Missing Podcast Prompt**
   - Error: Podcast doesn't have a prompt configured
   - Solution: Prompt user to configure podcast settings first

4. **API Timeout**
   - Error: Research takes too long
   - Solution: Jobs run async, check job status page

---

## Testing Checklist

- [ ] Service imports correctly
- [ ] Button appears in podcast list
- [ ] Button disabled state works
- [ ] Loading spinner shows during request
- [ ] Success notification displays
- [ ] Error notification displays
- [ ] Jobs appear in job tracking UI
- [ ] Job status updates correctly
- [ ] New job types display with correct labels
- [ ] Permission checks work (only editors see button)

---

## Optional: Research Topics Page

For a more complete implementation, consider creating a dedicated page to view and manage research topics:

### Route Configuration
```typescript
// app-routing.module.ts
{
  path: 'research',
  component: ResearchTopicsComponent,
  canActivate: [AuthGuard]
}
```

### Component
```typescript
// research-topics.component.ts
export class ResearchTopicsComponent implements OnInit {
  topics: Topic[] = [];
  
  ngOnInit(): void {
    this.loadTopics();
  }
  
  loadTopics(): void {
    this.researchService.getTopics().subscribe(topics => {
      this.topics = topics;
    });
  }
}
```

---

## Quick Start Summary

### Minimum Required Changes:

1. **Create** `research.service.ts` with the service code above
2. **Add** ResearchService to module providers
3. **Update** podcast list component with `onResearchEpisode()` method
4. **Add** "Research Episode" button to template
5. **Update** job kind enum with 4 new types
6. **Test** the feature!

That's it! The backend is fully implemented and ready to receive these GraphQL requests.

