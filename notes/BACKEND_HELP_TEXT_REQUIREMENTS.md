# Backend Help Text & Examples Requirements

**Generated:** December 26, 2025  
**Purpose:** Document all frontend hardcoded help text and examples that should be moved to the backend.

---

## Summary

The frontend currently has several locations with hardcoded help text, examples, and hints. These should be provided by the backend so all clients (web, mobile, CLI) get consistent, up-to-date information.

---

## 1. Markdown Rendering Support ✅

**Status:** Implemented

The frontend now renders markdown from backend messages as HTML. The backend can send rich markdown content including:
- Headers (`#`, `##`, etc.)
- Bold (`**text**`)
- Code blocks (`` `code` `` and fenced blocks)
- Lists (ordered and unordered)
- Pre-formatted text

---

## 2. Hardcoded Examples to Move to Backend

### 2.1 Terminal Modal - Empty State Hint
**File:** `src/app/terminal/terminal-modal/terminal-modal.component.html:25`
```html
<span class="examples">Try: <code>AAPL GP</code>, <code>HELP</code>, or ask anything</span>
```

**Backend Requirement:**  
Add `terminalHints` query or field to return suggested example commands:
```graphql
query GetTerminalHints {
  terminalHints {
    quickExamples     # e.g., ["AAPL GP", "HELP", "MSFT DES"]
    placeholderText   # e.g., "Type a command or ask a question..."
    emptyStateMessage # e.g., "Try: AAPL GP, HELP, or ask anything"
  }
}
```

---

### 2.2 Terminal Input - Empty State Hint
**File:** `src/app/terminal/terminal-input/terminal-input.component.html:28`
```html
<p class="hint">Try: <code>AAPL HP</code>, <code>HELP</code>, or ask a question.</p>
```

**Backend Requirement:** Same as 2.1 - use `terminalHints.emptyStateMessage`

---

### 2.3 Terminal Dashboard - Empty State Hint
**File:** `src/app/terminal/terminal-dashboard/terminal-dashboard.component.html:52`
```html
<p class="hint">Try: <code>AAPL GP</code> to create a price chart</p>
```

**Backend Requirement:**  
Add dashboard-specific hints:
```graphql
query GetDashboardHints {
  dashboardHints {
    emptyStateMessage  # e.g., "Run chart commands like 'AAPL GP' to populate your dashboard"
    chartSuggestion    # e.g., "AAPL GP"
  }
}
```

---

### 2.4 Terminal Page - Help Tab Content
**File:** `src/app/terminal/terminal-page/terminal-page.component.html:86-119`

This entire section is hardcoded:
```html
<h3>Available Commands</h3>
<div class="command-categories">
  <div class="category">
    <h4>Equity Commands</h4>
    <ul>
      <li><code>HP</code> - Historical prices (e.g., <code>AAPL HP -period 1Y</code>)</li>
      <li><code>DES</code> - Company description</li>
      <li><code>FA</code> - Financial analysis</li>
      <li><code>ERN</code> - Earnings data</li>
      <li><code>QUOTE</code> - Current quote</li>
    </ul>
  </div>
  <div class="category">
    <h4>Chart Commands</h4>
    <ul>
      <li><code>GP</code> - Price chart (candlestick)</li>
      <li><code>GIP</code> - Intraday chart</li>
      <li><code>COMPARE</code> - Compare stocks</li>
    </ul>
  </div>
  <div class="category">
    <h4>System Commands</h4>
    <ul>
      <li><code>HELP</code> - Show help</li>
      <li><code>HIST</code> - Command history</li>
      <li><code>SEARCH</code> - Search symbols</li>
      <li><code>CMD</code> - List commands</li>
    </ul>
  </div>
</div>
<div class="ai-note">
  <mat-icon>psychology</mat-icon>
  <p>You can also type natural language questions and our AI will interpret them for you.</p>
</div>
```

**Backend Requirement:**  
Enhance the existing `commands` query or add a dedicated help query:

```graphql
query GetTerminalHelp {
  terminalHelp {
    # Markdown formatted help content
    overview: String
    
    # Commands grouped by category
    categories {
      name        # e.g., "Equity Commands"
      commands {
        name        # e.g., "HP"
        description # e.g., "Historical prices"
        exampleUsage # e.g., "AAPL HP -period 1Y"
      }
    }
    
    # AI/NL features description
    aiNote: String  # e.g., "You can also type natural language questions..."
  }
}
```

---

## 3. Required New GraphQL Queries/Fields

### 3.1 `terminalSyntaxHelp` Query (Partially Documented)
**Status:** Referenced in TERMINAL_INTEGRATION_GUIDE.md but not implemented

```graphql
query GetTerminalSyntaxHelp {
  terminalSyntaxHelp {
    grammar: [String]          # Command syntax patterns
    examples: [String]         # Quick example commands
    naturalLanguageExamples: [String]  # NL query examples
  }
}
```

### 3.2 `terminalHints` Query (NEW)
```graphql
query GetTerminalHints {
  terminalHints {
    quickExamples: [String]     # ["AAPL GP", "HELP", "MSFT DES"]
    placeholderText: String     # "Type a command or ask a question..."
    emptyStateMessage: String   # "Try: AAPL GP, HELP, or ask anything"
  }
}
```

### 3.3 Enhanced `command` Query
The existing `command(name: String!)` query already has `exampleUsage`. Verify it's populated for all commands:
```graphql
query GetCommand($name: String!) {
  command(name: $name) {
    name
    description
    exampleUsage       # Should be populated for all commands
    parametersSchema   # JSON schema with parameter descriptions
    aliases
  }
}
```

---

## 4. Data Already Available from Backend

### 4.1 Commands Query ✅
```graphql
query GetCommands {
  commands(isActive: true) {
    name
    description
    category
    aliases
    requiresSymbol
    exampleUsage
    outputType
  }
}
```

**Frontend Usage:**  
- Can dynamically build the help tab from this data
- Can use for autocomplete suggestions

### 4.2 Command Descriptions from HELP Command ✅
The `HELP` command already returns markdown-formatted help text from the backend.

---

## 5. Implementation Recommendations

### Phase 1: Backend Additions

1. **Add `terminalHints` query** returning:
   - `quickExamples`: Array of example commands to try
   - `placeholderText`: Input placeholder text
   - `emptyStateMessage`: Full formatted message with examples

2. **Add `terminalSyntaxHelp` query** returning:
   - `grammar`: Array of syntax patterns
   - `examples`: Array of command examples with descriptions
   - `naturalLanguageExamples`: Array of NL query examples

3. **Ensure all commands have populated `exampleUsage`**:
   - HP: "AAPL HP -period 1Y"
   - DES: "AAPL DES"
   - GP: "AAPL GP -period 6M"
   - etc.

### Phase 2: Frontend Updates

1. **Replace hardcoded hints** with data from `terminalHints` query
2. **Replace help tab content** with dynamically loaded data from `commands` query grouped by category
3. **Use `terminalSyntaxHelp`** for any syntax documentation displays

---

## 6. Existing Backend Commands Query Response

Based on current schema, the `commands` query returns:
```typescript
interface Command {
  id: string;
  name: string;
  description: string;
  category: 'EQUITY' | 'CHART' | 'NEWS' | 'SCREENING' | 'SYSTEM' | 'RESEARCH' | 'PODCAST' | 'TEAM';
  aliases: string[];
  requiresSymbol: boolean;
  parametersSchema: string;  // JSON schema
  exampleUsage: string;
  outputType: string;
  chartType: string;
  creditsCost: number;
}
```

This can be used to dynamically generate the help tab if `exampleUsage` is properly populated.

---

## 7. Action Items for Backend

| Priority | Item | Description |
|----------|------|-------------|
| HIGH | Populate `exampleUsage` | Ensure all commands have example usage populated |
| HIGH | Add `terminalHints` query | Provide quick examples and empty state messages |
| MEDIUM | Add `terminalSyntaxHelp` query | Provide grammar and syntax documentation |
| MEDIUM | Rich HELP output | Ensure HELP command returns well-formatted markdown |
| LOW | Command categories ordering | Provide a way to order categories for display |

---

## 8. Frontend Files to Update

Once backend provides the data:

| File | Change |
|------|--------|
| `terminal-modal.component.html:25` | Load `terminalHints.emptyStateMessage` |
| `terminal-input.component.html:28` | Load `terminalHints.emptyStateMessage` |
| `terminal-dashboard.component.html:52` | Load `dashboardHints.emptyStateMessage` |
| `terminal-page.component.html:86-119` | Dynamically render from `commands` grouped by category |
| `terminal-page.component.ts` | Add method to load and group commands by category |

