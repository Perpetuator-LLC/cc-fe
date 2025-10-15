# Research Feature Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐        ┌──────────────────┐                  │
│  │ Podcast List    │        │ Research Service │                  │
│  │ Component       │───────▶│ (GraphQL Client) │                  │
│  │                 │        │                  │                  │
│  │ [Research       │        │ createResearch   │                  │
│  │  Episode]Btn    │        │ Chain()          │                  │
│  └─────────────────┘        └──────────────────┘                  │
│                                      │                              │
│                                      │ GraphQL Mutation             │
│                                      ▼                              │
└─────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ POST /graphql
                                       │
┌──────────────────────────────────────┼──────────────────────────────┐
│                           BACKEND    │                              │
├──────────────────────────────────────┼──────────────────────────────┤
│                                      ▼                              │
│  ┌───────────────────────────────────────────────────┐             │
│  │  GraphQL API (api/schema.py)                      │             │
│  │  ├─ ResearchMutation.createResearchChain          │             │
│  │  └─ Creates 4 Jobs + Starts Chain                 │             │
│  └───────────────────────────────────────────────────┘             │
│                          │                                          │
│                          ▼                                          │
│  ┌───────────────────────────────────────────────────┐             │
│  │  Celery Task Chain (research/tasks.py)            │             │
│  │                                                    │             │
│  │  ┌─────────────────────────────────────────┐     │             │
│  │  │ 1. create_topic_task                    │     │             │
│  │  │    ├─ Generates topic from podcast      │     │             │
│  │  │    │   prompt using AI                   │     │             │
│  │  │    └─ Creates Topic record              │     │             │
│  │  └──────────────┬──────────────────────────┘     │             │
│  │                 │ topic_uuid                      │             │
│  │                 ▼                                 │             │
│  │  ┌─────────────────────────────────────────┐     │             │
│  │  │ 2. research_topic_task                  │     │             │
│  │  │    ├─ Conducts research using AI        │     │             │
│  │  │    ├─ Collects sources                  │     │             │
│  │  │    └─ Updates Topic.research_content    │     │             │
│  │  └──────────────┬──────────────────────────┘     │             │
│  │                 │                                 │             │
│  │                 ▼                                 │             │
│  │  ┌─────────────────────────────────────────┐     │             │
│  │  │ 3. validate_research_task               │     │             │
│  │  │    ├─ Fact-checks all claims            │     │             │
│  │  │    ├─ Validates sources                 │     │             │
│  │  │    └─ Updates Topic.validated_content   │     │             │
│  │  └──────────────┬──────────────────────────┘     │             │
│  │                 │                                 │             │
│  │                 ▼                                 │             │
│  │  ┌─────────────────────────────────────────┐     │             │
│  │  │ 4. generate_research_transcript_task    │     │             │
│  │  │    ├─ Creates podcast transcript        │     │             │
│  │  │    ├─ Uses podcast intro/outro          │     │             │
│  │  │    └─ Updates Topic.transcript          │     │             │
│  │  └─────────────────────────────────────────┘     │             │
│  │                                                    │             │
│  └────────────────────────────────────────────────────             │
│                                                                     │
│  ┌───────────────────────────────────────────────────┐             │
│  │  Database Models                                  │             │
│  │  ├─ research_topic                                │             │
│  │  │   ├─ title                                     │             │
│  │  │   ├─ description                               │             │
│  │  │   ├─ research_content                          │             │
│  │  │   ├─ validated_content                         │             │
│  │  │   └─ transcript                                │             │
│  │  │                                                 │             │
│  │  └─ research_source                               │             │
│  │      ├─ topic_id (FK)                             │             │
│  │      ├─ title                                     │             │
│  │      ├─ url                                       │             │
│  │      └─ content                                   │             │
│  └───────────────────────────────────────────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Action
```
User clicks [Research Episode] button
   ↓
Frontend calls: researchService.createResearchChain(podcastUuid)
```

### 2. GraphQL Mutation
```graphql
mutation CreateResearchChain($podcastUuid: UUID!) {
  createResearchChain(podcastUuid: $podcastUuid) {
    success
    message
    jobs { id kind status }
  }
}
```

### 3. Backend Creates Job Chain
```python
# Creates 4 jobs
create_topic = Job(kind="create_research_topic")
research = Job(kind="research_topic")
validate = Job(kind="validate_research")
transcript = Job(kind="generate_research_transcript")

# Chains them together
chain(
  create_topic_task.si(),
  research_topic_task.si(),
  validate_research_task.si(),
  generate_research_transcript_task.si()
).apply_async()
```

### 4. Jobs Execute Sequentially
```
Job 1: CREATE_RESEARCH_TOPIC (pending → running → completed)
   ↓ (passes topic_uuid to next job)
Job 2: RESEARCH_TOPIC (pending → running → completed)
   ↓ (passes topic_uuid to next job)
Job 3: VALIDATE_RESEARCH (pending → running → completed)
   ↓ (passes topic_uuid to next job)
Job 4: GENERATE_RESEARCH_TRANSCRIPT (pending → running → completed)
```

### 5. Frontend Polls Job Status
```
User sees jobs in Job Tracking UI
   ↓
Jobs show as: pending → running → completed
   ↓
User can view completed research topic
```

---

## Component Architecture

```
src/
├── services/
│   └── research.service.ts          ← Create this (GraphQL client)
│
├── models/
│   └── job.model.ts                 ← Update this (add new job types)
│
└── app/
    ├── podcasts/
    │   └── podcast-list/
    │       ├── podcast-list.component.ts    ← Update this (add method)
    │       ├── podcast-list.component.html  ← Update this (add button)
    │       └── podcast-list.component.scss  ← Optional styling
    │
    └── jobs/
        └── job-list/
            └── job-list.component.ts        ← Auto-detects new types
```

---

## Job Status Lifecycle

```
┌─────────┐     ┌─────────┐     ┌───────────┐     ┌────────┐
│ PENDING │ ──▶ │ RUNNING │ ──▶ │ COMPLETED │  or │ FAILED │
└─────────┘     └─────────┘     └───────────┘     └────────┘
    ⏱️              🔄              ✅               ❌
  Waiting        Processing      Success          Error
```

**Status Colors:**
- `pending` → Yellow/Amber (#ffd54f)
- `running` → Blue (#42a5f5)
- `completed` → Green (#66bb6a)
- `failed` → Red (#ef5350)

---

## API Endpoints

### Primary Endpoint
```
POST /graphql
Content-Type: application/json
Authorization: Bearer <jwt_token>

Body:
{
  "query": "mutation CreateResearchChain($podcastUuid: UUID!) { ... }",
  "variables": { "podcastUuid": "abc-123" }
}
```

### Response Format
```json
{
  "data": {
    "createResearchChain": {
      "success": true,
      "message": "Research chain submitted successfully",
      "jobs": [
        {
          "id": "job-1-uuid",
          "kind": "create_research_topic",
          "status": "pending"
        },
        {
          "id": "job-2-uuid",
          "kind": "research_topic",
          "status": "pending"
        },
        {
          "id": "job-3-uuid",
          "kind": "validate_research",
          "status": "pending"
        },
        {
          "id": "job-4-uuid",
          "kind": "generate_research_transcript",
          "status": "pending"
        }
      ]
    }
  }
}
```

---

## Error Handling Flow

```
User clicks button
   ↓
┌──────────────────────────────────┐
│ Pre-flight Checks                │
│ ├─ User authenticated?           │
│ ├─ User has editor permissions?  │
│ ├─ Podcast exists?                │
│ └─ User has sufficient credits?  │
└──────────────────────────────────┘
   ↓ (if all pass)
Create jobs and start chain
   ↓
Monitor job execution
   ↓
┌──────────────────────────────────┐
│ Possible Errors                  │
│ ├─ Network error (show retry)    │
│ ├─ Auth error (redirect to login)│
│ ├─ Permission denied (show msg)  │
│ ├─ Insufficient credits (upsell) │
│ └─ Job failed (show error details)│
└──────────────────────────────────┘
```

---

## Performance Considerations

### Expected Execution Times
- **Create Topic**: ~10-30 seconds
- **Research**: ~30-60 seconds
- **Validate**: ~20-40 seconds
- **Generate Transcript**: ~20-40 seconds
- **Total Chain**: ~2-3 minutes

### Credits Cost
Each step consumes credits based on:
- Input tokens (prompt size)
- Output tokens (response size)
- Model: o3-mini with high reasoning effort

### Async Benefits
- User doesn't wait for completion
- Can monitor progress in Jobs UI
- Can continue using app
- Receives notification when done

---

## Testing Strategy

### Unit Tests
```typescript
describe('ResearchService', () => {
  it('should call createResearchChain mutation', () => {
    // Test mutation is called with correct variables
  });
  
  it('should handle errors gracefully', () => {
    // Test error handling
  });
});
```

### Integration Tests
```typescript
describe('PodcastListComponent', () => {
  it('should start research when button clicked', () => {
    // Test component method calls service
  });
  
  it('should show loading state', () => {
    // Test button disabled during request
  });
  
  it('should show success notification', () => {
    // Test snackbar appears
  });
});
```

### E2E Tests
```typescript
describe('Research Episode Feature', () => {
  it('should complete full research workflow', () => {
    // 1. Click button
    // 2. Verify jobs created
    // 3. Wait for completion
    // 4. Verify topic exists
  });
});
```

---

## Deployment Checklist

### Backend (Already Done ✅)
- [x] Models created and migrated
- [x] Tasks implemented
- [x] GraphQL schema added
- [x] Job types registered
- [x] Tests passing

### Frontend (To Do)
- [ ] Create ResearchService
- [ ] Update job type constants
- [ ] Add button to podcast list
- [ ] Update job list component
- [ ] Add research topics page (optional)
- [ ] Test with real data

---

## Future Enhancements

### Phase 2 Features
- View/edit research topics
- Regenerate individual steps
- Custom research parameters
- Topic templates
- Research history
- Export research to PDF
- Share research with team

### Phase 3 Features
- Collaborative editing
- Research versioning
- Scheduled research
- Research analytics
- Integration with episode editor
- Auto-publish researched episodes

