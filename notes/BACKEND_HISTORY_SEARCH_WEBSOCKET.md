# Backend WebSocket History Search Request

## Overview

The frontend terminal now supports command history navigation with substring matching. To properly support this, the backend needs to add a new WebSocket action for searching command history.

## Required WebSocket Action

### Action: `search_history`

**Request:**
```json
{
  "action": "search_history",
  "query": "AAPL",    // Optional: substring to search for in rawInput
  "limit": 5          // Max results to return (default: 5)
}
```

**Response:**
```json
{
  "type": "history.search",
  "query": "AAPL",
  "results": [
    {
      "id": "uuid-string",
      "rawInput": "STOCK:NASDAQ:AAPL COMMAND:CHART -period 1Y",
      "parsedCommand": "CHART",
      "parsedSymbols": ["AAPL"],
      "status": "completed",
      "isAiInterpreted": false,
      "createdAt": "2025-12-30T10:30:00+00:00"
    },
    {
      "id": "uuid-string",
      "rawInput": "STOCK:NASDAQ:AAPL COMMAND:HP",
      "parsedCommand": "HP",
      "parsedSymbols": ["AAPL"],
      "status": "completed",
      "isAiInterpreted": false,
      "createdAt": "2025-12-30T09:15:00+00:00"
    }
  ],
  "total": 42,  // Total matching records (for info)
  "timestamp": "2025-12-31T19:30:00+00:00"
}
```

## Query Logic

1. **Empty query** (`query: ""`): Return the user's most recent command history entries (newest first)
2. **With query** (`query: "AAPL"`): Search for entries where `rawInput` contains the substring (case-insensitive)
3. **Ordering**: Always return newest first
4. **Limit**: Default to 5, respect the `limit` parameter

## SQL Example

```python
from django.db.models import Q

def search_history(user, query='', limit=5):
    qs = CommandHistory.objects.filter(user=user)
    
    if query:
        qs = qs.filter(raw_input__icontains=query)
    
    return qs.order_by('-created_at')[:limit]
```

## Why This Is Needed

1. **zsh-like substring matching**: Users expect to type part of a previous command and use up-arrow to find matches
2. **Performance**: Instead of loading full history to the frontend, query the database for matches
3. **Deep history search**: Users may have executed a command many sessions ago

## Frontend Integration

The frontend will:
1. Call `searchHistory('')` when the input is focused (preload recent commands)
2. Call `searchHistory(text, 5)` when user presses up-arrow with text in the input
3. Display results in a dropdown above the input, with matching text highlighted
4. Load selected command into the input as FQN chips

## Fields Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique ID for the history entry |
| `rawInput` | string | Yes | The original command as submitted |
| `parsedCommand` | string | No | The command that was executed |
| `parsedSymbols` | string[] | No | Symbols that were parsed |
| `status` | string | Yes | "completed", "failed", "pending" |
| `isAiInterpreted` | boolean | No | True if command went through AI |
| `createdAt` | string | Yes | ISO 8601 timestamp |

