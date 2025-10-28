# Episode Length Control Refactoring

**Date:** October 27, 2025

## Overview

Refactored the episode generation system to remove hardcoded word/minute targets from prompts and consolidate all length control into the `news_target_words` and `research_target_words` fields on the Podcast model.

## Changes Made

### 1. GraphQL Schema Updates

**File:** `api/podcasts/schema.py`

- **Added fields to `PodcastType`:**
  - `news_target_words: Int!`
  - `research_target_words: Int!`

- **Added arguments to `UpdatePodcast` mutation:**
  - `news_target_words: Int`
  - `research_target_words: Int`

- **Added mutation handling** for updating these fields

These fields are now queryable and updatable via GraphQL.

### 2. Model Default Prompts Updated

**File:** `api/models.py`

**Before:**
```python
news_prompt = models.TextField(
    default="""Target: 3 minutes / ~450 words / ~3000 characters

Focus:
- Current events and breaking news
...
```

**After:**
```python
news_prompt = models.TextField(
    default="""Focus:
- Current events and breaking news
...
```

Same changes applied to `research_prompt` - removed all hardcoded length references.

### 3. Agent Fallback Prompts Updated

**File:** `api/podcasts/agents.py`

- Removed hardcoded length targets from the system message in `PodcastMetadataAgent`
- Updated fallback `news_prompt` and `research_prompt` to remove length targets
- Changed from: "News episodes: 3 minutes, ~450 words, current events focus"
- Changed to: "News episodes: current events focus, concise and timely"

### 4. Task Fallback Prompts Updated

**File:** `api/podcasts/tasks.py`

- Removed hardcoded length targets from fallback prompts in `generate_podcast_task`
- These fallbacks are now consistent with the model defaults

### 5. Episode Generation Enhanced

**File:** `api/episodes/tasks.py`

The `generate_transcript_prompt()` function already uses dynamic parameters:

```python
if episode_type == "research":
    target_words = podcast.research_target_words if hasattr(podcast, "research_target_words") else 1400
else:  # news episode
    target_words = podcast.news_target_words if hasattr(podcast, "news_target_words") else 450
```

The prompt dynamically includes:
- Calculated target minutes based on word count
- Words per topic allocation
- Available words after intro/outro
- Critical length requirements with actual values from the model

### 6. Research Episode Generation Enhanced

**File:** `research/tasks.py`

Updated `generate_transcript_prompt()` to include dynamic word count targets:

```python
target_words = podcast.research_target_words if hasattr(podcast, "research_target_words") else 1400
target_minutes = int(target_words / 150)
```

Now includes "CRITICAL LENGTH REQUIREMENT" section with dynamic values in the research episode prompt.

### 7. Data Migration Created

**File:** `api/migrations/0025_update_existing_podcast_prompts.py`

Created a data migration that:
- Finds all existing podcasts with old prompt format (containing "Target: 3 minutes" or "~450 words")
- Updates them to the new format without hardcoded lengths
- Preserves the `news_target_words` and `research_target_words` values (450 and 1400 defaults)

## Benefits

1. **Single Source of Truth:** Length targets are now only defined in `news_target_words` and `research_target_words` fields
2. **User Customizable:** Podcast owners can adjust target word counts via GraphQL without modifying prompts
3. **Dynamic Prompts:** All length guidance in prompts is calculated from these fields
4. **Cleaner Prompts:** Prompts focus on style and content, not length specifications
5. **Consistent Behavior:** All episode generation flows use the same length parameters

## How It Works

### News Episodes

1. Default target: 450 words (configurable via `podcast.news_target_words`)
2. Prompt dynamically includes: "Target: X minutes (Y words MAXIMUM)"
3. Validation allows 20% tolerance: `word_count > target_words * 1.2`

### Research Episodes

1. Default target: 1400 words (configurable via `podcast.research_target_words`)
2. Prompt dynamically includes: "Target: X minutes (Y words MAXIMUM)"
3. Same validation logic applies

## Usage

### Query podcast length settings:

```graphql
query {
  podcasts {
    edges {
      node {
        name
        newsTargetWords
        researchTargetWords
        newsPrompt
        researchPrompt
      }
    }
  }
}
```

### Update podcast length settings:

```graphql
mutation {
  updatePodcast(
    podcastUuid: "..."
    newsTargetWords: 600
    researchTargetWords: 2000
  ) {
    success
    message
    podcast {
      newsTargetWords
      researchTargetWords
    }
  }
}
```

## Files Modified

1. `api/podcasts/schema.py` - Added GraphQL fields and mutation arguments
2. `api/models.py` - Removed hardcoded lengths from default prompts
3. `api/podcasts/agents.py` - Updated fallback prompts and system messages
4. `api/podcasts/tasks.py` - Updated fallback prompts
5. `research/tasks.py` - Added dynamic length requirements to research episodes
6. `api/migrations/0025_update_existing_podcast_prompts.py` - Data migration for existing podcasts

## Testing

- [x] GraphQL schema includes new fields
- [x] Migration created and applied successfully
- [x] All hardcoded length targets removed from active code
- [x] Dynamic length calculation working in episode generation
- [x] Validation using dynamic targets

## Notes

- Old migration files still contain hardcoded values (this is expected and correct)
- Existing podcasts have been updated via data migration
- Default values remain 450 words (news) and 1400 words (research)
- All prompts now focus on content/style guidance, with length specified separately via the model fields

