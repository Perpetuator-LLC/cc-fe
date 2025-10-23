# Episode Versioning - GraphQL Schema Changes

## Quick Reference for Frontend Team

---

## 🔴 BREAKING CHANGES

### Removed from `EpisodeType`:
```graphql
type EpisodeType {
  version: Int!  # ❌ REMOVED - Use currentVersionNumber
  unvalidatedContent: String  # ❌ REMOVED - Use versions array
}
```

### Added to `EpisodeType`:
```graphql
type EpisodeType {
  currentVersionNumber: Int!  # ✅ NEW - Current version (starts at 1)
  isCurrentValidated: Boolean!  # ✅ NEW - Is current version validated?
  versions: [EpisodeVersionType!]!  # ✅ NEW - Full version history
}
```

---

## 🆕 NEW TYPE: EpisodeVersionType

```graphql
type EpisodeVersionType {
  uuid: UUID!
  versionNumber: Int!
  title: String!
  description: String!
  content: String!  # Full transcript at this version
  isValidated: Boolean!
  validationNotes: String  # AI validation notes (if validated)
  changeType: String!  # "created" | "validated" | "edited" | "regenerated"
  createdAt: DateTime!
  createdBy: UserType  # Who made this change
}
```

---

## 🆕 NEW MUTATIONS

### 1. Edit Episode (Manual Content Changes)
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
    success: Boolean!
    message: String!
    episode: EpisodeType
  }
}
```

**Effect:** Creates new unvalidated version with `changeType: "edited"`

---

### 2. Validate Episode Manually
```graphql
mutation ValidateEpisodeManual($episodeUuid: UUID!) {
  validateEpisodeManual(episodeUuid: $episodeUuid) {
    success: Boolean!
    message: String!
    job: JobType  # Poll for completion
  }
}
```

**Effect:** Triggers AI validation, creates new validated version when complete

---

### 3. Regenerate Episode
```graphql
mutation RegenerateEpisode($episodeUuid: UUID!) {
  regenerateEpisode(episodeUuid: $episodeUuid) {
    success: Boolean!
    message: String!
    job: JobType  # Poll for completion
  }
}
```

**Effect:** Regenerates entire episode from source articles, creates new version

---

### 4. Revert to Previous Version
```graphql
mutation RevertEpisodeVersion(
  $episodeUuid: UUID!
  $versionNumber: Int!
) {
  revertEpisodeVersion(
    episodeUuid: $episodeUuid
    versionNumber: $versionNumber
  ) {
    success: Boolean!
    message: String!
    episode: EpisodeType
  }
}
```

**Effect:** Copies content from specified version, creates new version

---

## 🔄 UPDATED MUTATION: updateEpisode

**NOW VERSION-AWARE:** Creates new version when content fields change

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
    success: Boolean!
    message: String!
    episode: EpisodeType
  }
}
```

**Behavior:**
- Content changes (title/description/content) → Creates new version, sets `isCurrentValidated: false`
- Only `isLive` changes → No version created

---

## 📖 EXAMPLE QUERIES

### Get Episode with Version History
```graphql
query {
  episode(id: "uuid-here") {
    uuid
    title
    content
    currentVersionNumber
    isCurrentValidated
    versions {
      versionNumber
      changeType
      isValidated
      content
      createdAt
      createdBy {
        username
      }
    }
  }
}
```

### Get Only Latest Validated Version
```graphql
query {
  episode(id: "uuid-here") {
    currentVersionNumber
    isCurrentValidated
    versions(
      where: { isValidated: true }
      orderBy: ["-versionNumber"]
      first: 1
    ) {
      versionNumber
      content
      validationNotes
    }
  }
}
```

---

## 🔀 VERSION FLOW EXAMPLES

### Example 1: Episode Creation
```
User creates episode
  ↓
Version 1 created (changeType: "created", isValidated: false)
  ↓
Automatic validation runs
  ↓
Version 2 created (changeType: "validated", isValidated: true)
  ↓
Audio generation uses Version 2 content
```

### Example 2: User Edits Episode
```
Episode at Version 3 (validated)
  ↓
User calls editEpisode mutation
  ↓
Version 4 created (changeType: "edited", isValidated: false)
  ↓
User calls validateEpisodeManual
  ↓
Version 5 created (changeType: "validated", isValidated: true)
```

### Example 3: Revert to Previous Version
```
Episode at Version 5
  ↓
User reverts to Version 2
  ↓
Version 6 created with Version 2's content
(Version 2's validation status copied)
```

---

## ⚠️ IMPORTANT NOTES

1. **Version Numbers Never Decrease**
   - Reverting to v2 creates v6 (with v2's content)
   - Preserves complete audit trail

2. **Audio Uses Current Content**
   - Always uses `episode.content` (current version)
   - Recommend validating before audio generation

3. **Validation Changes Content**
   - AI may fix factual errors
   - Preserves TTS formatting (spoken numbers/dates)
   - Compare versions to see what changed

4. **All Mutations Require Editor Role**
   - User must be editor+ on podcast's team

---

## 🎯 FRONTEND MUST IMPLEMENT

### Critical UI Elements:

1. **Validation Status Indicator**
   ```
   ✓ Validated (v5)
   ⚠ Unvalidated (v5) [Validate Now]
   ```

2. **Version History List**
   - Show all versions with timestamps
   - Indicate which is current
   - Show validated vs unvalidated
   - Allow click to view or revert

3. **Version Comparison View**
   - Side-by-side or unified diff
   - Highlight changes between versions

4. **Job Polling**
   - Poll validation/regeneration jobs every 2s
   - Show progress indicator
   - Refetch episode when complete

---

## 🚀 MIGRATION CHECKLIST

- [ ] Update TypeScript types
  - [ ] Remove `version`, `unvalidatedContent`
  - [ ] Add `currentVersionNumber`, `isCurrentValidated`, `versions`
- [ ] Update all episode queries
  - [ ] Include new fields in fragments
- [ ] Replace `episode.version` references
  - [ ] Use `episode.currentVersionNumber`
- [ ] Add new UI components
  - [ ] `<VersionHistoryPanel />`
  - [ ] `<ValidationStatusBadge />`
  - [ ] `<VersionComparisonView />`
  - [ ] `<EditEpisodeModal />`
- [ ] Implement new mutations
  - [ ] `editEpisode`
  - [ ] `validateEpisodeManual`
  - [ ] `regenerateEpisode`
  - [ ] `revertEpisodeVersion`
- [ ] Add job polling for async operations
- [ ] Update validation flow
- [ ] Test all scenarios

---

## 📞 QUESTIONS?

Refer to full integration guide: `frontend_integration_episode_versioning.md`

