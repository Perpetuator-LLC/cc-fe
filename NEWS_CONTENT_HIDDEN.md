# News Content Hidden - November 23, 2025 ✅

## Summary

Successfully hid the "Site Content" section in the news detail panel, keeping only the AI Summary and Validated Summary sections visible.

---

## What Changed

**File Modified:** `src/app/news/news.component.html`

**Change:** Commented out the entire "Site Content" section (lines ~388-401)

---

## Sections Now Visible in News Detail Panel

When viewing a news article, users will see:

1. **RSS Description** - The description from the RSS feed
2. **AI Summary** - AI-generated summary with:
   - "Process News" button
   - "Generate Summary (Force)" button (for users with permissions)
   - Summary content or "No news summary available"
3. **Validated Summary** - Validated summary content or "News not (yet) validated"

---

## Section Now Hidden

❌ **Site Content** - Completely hidden including:
- Extract News button
- "Site Content" heading
- Actual content from the news article website
- "No news content available" message

This entire section was wrapped in a permissions check and is now commented out.

---

## Code Changes

### Before
```html
@if (userService.userDetails()?.permissions?.includes('api.change_news')) {
  <mat-divider></mat-divider>
  <button mat-flat-button color="primary" type="button" (click)="extractNews([selectedNewsDetail.uuid])">
    Extract News
  </button>
  <h3>Site Content</h3>
  @if (selectedNewsDetail.content) {
    <p class="" [innerHTML]="markdownToHtml(selectedNewsDetail.content)"></p>
  } @else {
    <p class="">No news content available</p>
  }
}
```

### After
```html
<!-- Site Content section hidden - showing only Summary and Validated Summary -->
<!-- 
@if (userService.userDetails()?.permissions?.includes('api.change_news')) {
  <mat-divider></mat-divider>
  <button mat-flat-button color="primary" type="button" (click)="extractNews([selectedNewsDetail.uuid])">
    Extract News
  </button>
  <h3>Site Content</h3>
  @if (selectedNewsDetail.content) {
    <p class="" [innerHTML]="markdownToHtml(selectedNewsDetail.content)"></p>
  } @else {
    <p class="">No news content available</p>
  }
}
-->
```

---

## Why Commented vs Deleted

The section is **commented out** rather than deleted so it can be easily restored if needed in the future. The comment clearly indicates why it was hidden: "showing only Summary and Validated Summary".

---

## User Impact

### What Users Will See
- Cleaner, more focused news detail panel
- Only the relevant AI-generated and validated summaries
- No raw website content clutter

### What Users Won't See Anymore
- Raw content extracted from news websites
- "Extract News" button (even for users with permissions)
- "Site Content" heading

---

## To Restore This Section

If you want to restore the Site Content section in the future, simply:

1. Open `src/app/news/news.component.html`
2. Find the comment starting with `<!-- Site Content section hidden`
3. Uncomment the entire `@if` block
4. Remove the HTML comment tags

---

## Build Status

✅ No new errors introduced  
✅ Pre-existing warnings remain (unrelated to this change)  
✅ Change is clean and reversible

---

## Testing Checklist

- [ ] Open news page
- [ ] Fetch news for a podcast
- [ ] Click on a news article to view details
- [ ] **Verify:** RSS Description is visible
- [ ] **Verify:** AI Summary section is visible with buttons
- [ ] **Verify:** Validated Summary section is visible
- [ ] **Verify:** "Site Content" section is NOT visible
- [ ] **Verify:** "Extract News" button is NOT visible

---

## Related Files

- Modified: `src/app/news/news.component.html`
- No changes needed to: `src/app/news/news.component.ts` (logic remains intact)
- No changes needed to: `src/app/news/news.component.scss` (styles remain intact)

---

## Completion

✅ **News content section successfully hidden**  
✅ **Only Summary and Validated Summary sections visible**  
✅ **Change is clean and reversible**

The news detail panel now focuses exclusively on the AI-generated summaries without showing the raw website content.

