# Frontend Integration Guide: Episode Versioning System

**Date:** October 22, 2025  
**Feature:** Comprehensive Episode Versioning with History Tracking

## Overview

We've implemented a complete versioning system for episodes that tracks all changes, validations, and regenerations. Users can now see the full history of an episode, compare versions, revert to previous versions, and understand whether their current content has been validated.

---

## 🔄 Breaking Changes

### Removed Fields
- ❌ `Episode.version` → Use `Episode.currentVersionNumber` instead
- ❌ `Episode.unvalidatedContent` → Use `Episode.versions` array to access historical content

### New Fields
- ✅ `Episode.currentVersionNumber: Int!` - Current version number (starts at 1)
- ✅ `Episode.isCurrentValidated: Boolean!` - Whether current version is validated
- ✅ `Episode.versions: [EpisodeVersionType!]!` - Array of all version snapshots

---

## 📊 New GraphQL Types

### `EpisodeVersionType`
Represents a snapshot of an episode at a specific point in time.

```graphql
type EpisodeVersionType {
  uuid: UUID!
  versionNumber: Int!
  title: String!
  description: String!
  content: String!
  isValidated: Boolean!
  validationNotes: String
  changeType: String!  # "created" | "validated" | "edited" | "regenerated"
  createdAt: DateTime!
  createdBy: UserType
}
```

**Change Types:**
- `"created"` - Initial episode creation
- `"validated"` - After AI fact-checking/validation
- `"edited"` - Manual user edits
- `"regenerated"` - Regenerated from source articles

---

## 📝 Updated Episode Type

### Before
```graphql
type EpisodeType {
  uuid: UUID!
  title: String!
  description: String!
  content: String!
  version: Int!  # ❌ REMOVED
  unvalidatedContent: String  # ❌ REMOVED
  date: DateTime!
  audioFile: String
  audioSeconds: Int
  audioUrl: String
  news: [NewsType!]!
  podcast: PodcastType!
  isLive: Boolean!
  podcastDate: DateTime
  telegramDate: DateTime
  podcastEpisodeGuid: UUID!
}
```

### After
```graphql
type EpisodeType {
  uuid: UUID!
  title: String!
  description: String!
  content: String!
  currentVersionNumber: Int!  # ✅ NEW
  isCurrentValidated: Boolean!  # ✅ NEW
  versions: [EpisodeVersionType!]!  # ✅ NEW
  date: DateTime!
  audioFile: String
  audioSeconds: Int
  audioUrl: String
  news: [NewsType!]!
  podcast: PodcastType!
  isLive: Boolean!
  podcastDate: DateTime
  telegramDate: DateTime
  podcastEpisodeGuid: UUID!
}
```

---

## 🆕 New Mutations

### 1. `editEpisode` - Manually Edit Episode Content

**Purpose:** Allow users to manually edit episode content. Creates a new version marked as unvalidated.

```graphql
mutation EditEpisode(
  $episodeUuid: UUID!
  $title: String
  $description: String
  $content: String
) {
  editEpisode(
    episodeUuid: $episodeUuid
    title: $title
    description: $description
    content: $content
  ) {
    success
    message
    episode {
      uuid
      title
      description
      content
      currentVersionNumber
      isCurrentValidated
      versions {
        versionNumber
        changeType
        isValidated
        createdAt
        createdBy {
          username
        }
      }
    }
  }
}
```

**Example:**
```graphql
mutation {
  editEpisode(
    episodeUuid: "123e4567-e89b-12d3-a456-426614174000"
    content: "Updated transcript content..."
  ) {
    success
    message
    episode {
      currentVersionNumber  # Will be incremented
      isCurrentValidated    # Will be false
    }
  }
}
```

**Notes:**
- At least one field (title, description, or content) must be provided
- Automatically marks episode as unvalidated
- Creates new version with `changeType: "edited"`

---

### 2. `validateEpisodeManual` - Trigger Validation on Current Content

**Purpose:** Manually trigger AI fact-checking/validation on the current episode content.

```graphql
mutation ValidateEpisodeManual($episodeUuid: UUID!) {
  validateEpisodeManual(episodeUuid: $episodeUuid) {
    success
    message
    job {
      id
      kind
      status
      result
    }
  }
}
```

**Example:**
```graphql
mutation {
  validateEpisodeManual(
    episodeUuid: "123e4567-e89b-12d3-a456-426614174000"
  ) {
    success
    message
    job {
      id
      status  # Poll this to check completion
    }
  }
}
```

**Notes:**
- Returns a job that you should poll for completion
- When complete, episode will have a new validated version
- `isCurrentValidated` will be set to `true`
- May modify content to fix factual errors while preserving TTS formatting

---

### 3. `regenerateEpisode` - Regenerate Episode from Sources

**Purpose:** Regenerate the entire episode from its original source articles using AI.

```graphql
mutation RegenerateEpisode($episodeUuid: UUID!) {
  regenerateEpisode(episodeUuid: $episodeUuid) {
    success
    message
    job {
      id
      kind
      status
      result
    }
  }
}
```

**Example:**
```graphql
mutation {
  regenerateEpisode(
    episodeUuid: "123e4567-e89b-12d3-a456-426614174000"
  ) {
    success
    message
    job {
      id
      status
    }
  }
}
```

**Notes:**
- Episode must have associated news articles
- Completely regenerates title, description, and transcript
- Creates new version with `changeType: "regenerated"`
- New version is marked as unvalidated
- Useful when podcast prompts or style preferences change

---

### 4. `revertEpisodeVersion` - Revert to Previous Version

**Purpose:** Revert the episode to any previous version in its history.

```graphql
mutation RevertEpisodeVersion(
  $episodeUuid: UUID!
  $versionNumber: Int!
) {
  revertEpisodeVersion(
    episodeUuid: $episodeUuid
    versionNumber: $versionNumber
  ) {
    success
    message
    episode {
      uuid
      title
      description
      content
      currentVersionNumber
      isCurrentValidated
    }
  }
}
```

**Example:**
```graphql
mutation {
  revertEpisodeVersion(
    episodeUuid: "123e4567-e89b-12d3-a456-426614174000"
    versionNumber: 3
  ) {
    success
    message
    episode {
      currentVersionNumber  # Will be new version (e.g., 8)
      isCurrentValidated    # Copied from version 3
      content               # Content from version 3
    }
  }
}
```

**Notes:**
- Creates a new version with the content from the specified version
- Increments version number (doesn't actually go backwards)
- Preserves full history - no data is lost
- Copies validation status from the reverted version

---

## 🔄 Updated Mutations

### `updateEpisode` - Now Version-Aware

**Previously:** Directly updated fields without versioning  
**Now:** Creates a new version snapshot when content fields change

```graphql
mutation UpdateEpisode(
  $episodeUuid: UUID!
  $title: String
  $description: String
  $content: String
  $isLive: Boolean
) {
  updateEpisode(
    episodeUuid: $episodeUuid
    title: $title
    description: $description
    content: $content
    isLive: $isLive
  ) {
    success
    message
    episode {
      uuid
      currentVersionNumber  # Incremented if content changed
      isCurrentValidated    # Set to false if content changed
    }
  }
}
```

**Notes:**
- If `title`, `description`, or `content` changes → creates new version
- If only `isLive` changes → no new version created
- Use `editEpisode` for clearer content-editing semantics

---

## 📖 Query Examples

### Fetch Episode with Version History

```graphql
query GetEpisodeWithVersions($episodeUuid: UUID!) {
  episode(id: $episodeUuid) {
    uuid
    title
    description
    content
    currentVersionNumber
    isCurrentValidated
    date
    audioUrl
    podcast {
      name
    }
    versions {
      uuid
      versionNumber
      title
      description
      content
      isValidated
      validationNotes
      changeType
      createdAt
      createdBy {
        username
        email
      }
    }
  }
}
```

### Get Latest Validated Version

```graphql
query GetLatestValidatedVersion($episodeUuid: UUID!) {
  episode(id: $episodeUuid) {
    uuid
    currentVersionNumber
    isCurrentValidated
    versions(isValidated: true, orderBy: "-versionNumber", first: 1) {
      versionNumber
      content
      validationNotes
      createdAt
    }
  }
}
```

### Compare Current with Previous Version

```graphql
query CompareVersions($episodeUuid: UUID!) {
  episode(id: $episodeUuid) {
    uuid
    title
    content
    currentVersionNumber
    isCurrentValidated
    versions(orderBy: "-versionNumber", first: 2) {
      versionNumber
      title
      content
      changeType
      isValidated
      createdAt
    }
  }
}
```

---

## 🎨 UI/UX Recommendations

### 1. Version History Panel
Show a timeline of all versions with:
- Version number badge
- Change type icon (created/validated/edited/regenerated)
- Validation status indicator (✓ validated / ⚠ unvalidated)
- Timestamp and user who made the change
- "View" and "Revert to this version" buttons

### 2. Validation Status Badge
Display prominently on episode detail page:
```
✓ Validated (v5)
⚠ Unvalidated (v5) - Click to validate
```

### 3. Before/After Comparison
When validation completes, show a diff view:
- **Before:** Version 4 (unvalidated)
- **After:** Version 5 (validated)
- Highlight what changed

### 4. Edit Workflow
```
1. User clicks "Edit Episode"
2. Modal/form opens with current content
3. User makes changes
4. Submit creates new unvalidated version
5. Show banner: "Episode edited (v6, unvalidated). Validate now?"
6. User can click to trigger validation
```

### 5. Regenerate Warning
Show confirmation dialog:
```
⚠️ Warning: This will regenerate the entire episode from source articles.
Current content (v5) will be saved in history.
Continue?
[Cancel] [Regenerate]
```

---

## 🔔 Real-time Updates

### Polling for Validation Completion

When `validateEpisodeManual` or `regenerateEpisode` returns a job:

```typescript
const pollJobStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    const { data } = await client.query({
      query: GET_JOB_STATUS,
      variables: { jobId },
      fetchPolicy: 'network-only'
    });
    
    if (data.job.status === 'completed') {
      clearInterval(interval);
      // Refetch episode to get new version
      refetchEpisode();
      showNotification('Validation complete!');
    } else if (data.job.status === 'failed') {
      clearInterval(interval);
      showError(data.job.result?.message);
    }
  }, 2000); // Poll every 2 seconds
};
```

---

## 📊 Episode Creation Flow Changes

### Automatic Versioning in Episode Chains

All episode creation flows now automatically create versions:

**1. Create Episode → Validate Flow:**
```
createEpisodeChain → Creates episode (v1, unvalidated)
                  → Validates episode (v2, validated)
                  → Generates audio (uses v2 content)
```

**2. Version States:**
- **v1**: Created from news articles (unvalidated)
- **v2**: Fact-checked and validated (validated)
- Audio generation ALWAYS uses the latest validated version

### Important: Audio Uses Current Content

When you generate audio (`updateEpisodeAudio`), it uses `episode.content` (the current version). 

**Best Practice:**
- Always validate before generating audio
- Show warning if generating audio for unvalidated content

---

## 🐛 Error Handling

### Common Errors

**Episode Not Found:**
```json
{
  "success": false,
  "message": "Episode not found"
}
```

**Version Not Found:**
```json
{
  "success": false,
  "message": "Version 10 not found"
}
```

**No News Articles to Regenerate:**
```json
{
  "success": false,
  "message": "Episode has no associated news to regenerate from"
}
```

**Permission Denied:**
```json
{
  "success": false,
  "message": "User must be at least an editor for this team"
}
```

---

## 🔐 Permissions

All new mutations require **Editor** role or higher:
- `editEpisode` → Editor+
- `validateEpisodeManual` → Editor+
- `regenerateEpisode` → Editor+
- `revertEpisodeVersion` → Editor+

---

## 📱 Mobile Considerations

### Optimized Queries
For mobile, fetch minimal version data:

```graphql
query GetEpisodeForMobile($episodeUuid: UUID!) {
  episode(id: $episodeUuid) {
    uuid
    title
    content
    currentVersionNumber
    isCurrentValidated
    audioUrl
    # Don't fetch full version history on mobile
  }
}
```

### Separate Version History View
Only fetch full version history when user explicitly navigates to "Version History" screen:

```graphql
query GetVersionHistory($episodeUuid: UUID!) {
  episode(id: $episodeUuid) {
    uuid
    versions {
      versionNumber
      changeType
      isValidated
      createdAt
    }
  }
}
```

---

## 🧪 Testing Checklist

### Test Scenarios

- [ ] Create new episode → verify v1 created
- [ ] Validate episode → verify v2 created with `isValidated: true`
- [ ] Edit episode → verify new version created with `isValidated: false`
- [ ] Regenerate episode → verify new version created
- [ ] Revert to previous version → verify content restored and new version created
- [ ] View version history → verify all versions displayed correctly
- [ ] Compare versions → verify diff showing correctly
- [ ] Generate audio after validation → verify uses validated content
- [ ] Generate audio without validation → verify warning shown
- [ ] Poll job status → verify real-time updates work

---

## 📋 Migration Guide

### Step 1: Update Type Definitions

```typescript
// OLD
interface Episode {
  uuid: string;
  title: string;
  content: string;
  version: number;  // ❌ Remove
  unvalidatedContent?: string;  // ❌ Remove
  // ...
}

// NEW
interface EpisodeVersion {
  uuid: string;
  versionNumber: number;
  title: string;
  description: string;
  content: string;
  isValidated: boolean;
  validationNotes?: string;
  changeType: 'created' | 'validated' | 'edited' | 'regenerated';
  createdAt: string;
  createdBy?: User;
}

interface Episode {
  uuid: string;
  title: string;
  content: string;
  currentVersionNumber: number;  // ✅ Add
  isCurrentValidated: boolean;   // ✅ Add
  versions: EpisodeVersion[];    // ✅ Add
  // ...
}
```

### Step 2: Update Queries

```typescript
// Update all episode queries to include new fields
const GET_EPISODE = gql`
  query GetEpisode($uuid: UUID!) {
    episode(id: $uuid) {
      uuid
      title
      content
      currentVersionNumber
      isCurrentValidated
      versions {
        versionNumber
        changeType
        isValidated
        createdAt
      }
    }
  }
`;
```

### Step 3: Replace References

```typescript
// OLD
episode.version  // ❌

// NEW
episode.currentVersionNumber  // ✅
```

### Step 4: Add Version UI Components

Create new components:
- `<VersionHistoryPanel />`
- `<ValidationStatusBadge />`
- `<VersionComparisonView />`
- `<RevertVersionModal />`

---

## 🎯 Key Benefits for Users

1. **Full Transparency** - See exactly what changed and when
2. **Undo/Redo** - Revert to any previous version
3. **Validation Tracking** - Know if content is fact-checked
4. **Audit Trail** - See who made what changes
5. **Safe Experimentation** - Edit without fear of losing previous work
6. **Quality Control** - Ensure audio is generated from validated content

---

## 📞 Support

For questions or issues:
- Backend API: Check job status and error messages
- Frontend Integration: Reference this guide
- Version conflicts: Use `revertEpisodeVersion` to restore

**Last Updated:** October 22, 2025

