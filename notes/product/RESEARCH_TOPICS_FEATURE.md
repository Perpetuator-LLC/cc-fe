# Research Topics Feature

## Overview
The research feature creates **Topics** (not Episodes). Topics are research documents that contain:
- **Research Content**: Raw research gathered from sources
- **Validated Content**: Fact-checked and validated research
- **Transcript**: Final podcast transcript generated from the research
- **Sources**: Citations and references used in the research

## How to Use

### 1. Start Research
From the Podcasts list page, click the **"Research Episode"** button (purple button with science icon) next to any podcast.

This will:
- Create 4 jobs that run automatically in sequence
- Show job progress in the job status bar
- Take several minutes to complete

### 2. View Research Topics
Once the research jobs complete, you'll see a success message with a link to view topics.

Navigate to **Research Topics** in the sidebar menu or go to `/topics` to see all your research topics.

### 3. View Topic Details
Click on any topic to view:
- **Transcript Tab**: The final podcast transcript
- **Validated Research Tab**: Fact-checked content
- **Raw Research Tab**: Original research content
- **Sources Tab**: All citations and references

## The Research Workflow

When you click "Research Episode", the backend creates 4 jobs:

1. **Create Research Topic** - AI generates a topic based on the podcast's prompt/brand
2. **Research Topic** - Conducts research and collects sources
3. **Validate Research** - Fact-checks all claims
4. **Generate Research Transcript** - Creates the final podcast transcript

All jobs run automatically in sequence.

## Viewing Results

### Topics List Page (`/topics`)
- Shows all research topics across all podcasts
- Displays status (In Progress, Researched, Validated, Complete)
- Filter and search functionality
- Click "View" to see topic details

### Topic Detail Page (`/topic/:uuid`)
- Full topic information with tabs for each stage
- View the final transcript
- Review validated research
- See all sources and citations
- Navigate back to topics list

## Navigation

The **Research Topics** menu item appears in the main navigation with a science icon (🧪).

## Notes

- Research topics are separate from episodes
- The transcript can be used to create an episode (future feature)
- Each topic tracks its completion status
- Sources are automatically collected and cited
- All content is fact-checked before transcript generation

