# GPT

To assist in development of this project:
https://chatgpt.com/g/g-D8TyqKkaO-angular-18-coding-copilot

# Capital Copilot Front-End

## Personas

### Personal: Pay for Commercial Free Custom News Feeds
- Pick your voice
- Pick your news sources
- Pick your topics
- Pick your frequency
- Pick your length
- Pick your format
- Pick your delivery method

### Brand: Pay for a Custom Brand Channel
- Same as above but for a team
- Add Validator that can search internet to verify news
  - Is this a cost to upgrade or we enforce this on all teams?
  - Is this part of our brand or a separate service?
- Add Schedule so it automatically produces feed every day
- Accept ads, custom or use our network to monetize
- Podcast and Telegram etc. Analytics
- Auto create podcasts on different platforms
  - YouTube Music
  - Amazon Music
  - iTunes
  - Apple Podcasts
  - Spotify

### Podcast: Pay for a Custom Podcast

## Fixes

- [ ] Balance doesn't update on usage, when jobs finish add the new balance and then push the update to the credits
- [ ] On team select run fetch
- [ ] Add Podcast properties
- [ ] Consider 
- [ ] Add Podcast categories support
- [ ] When navigating away from team prompt editing, either make it auto-save or prompt to save
- [ ] Email debounce
- [ ] Allow user to remove self from team, even if not owner
- [ ] Disable Publish if not publisher or greater and disable Create Article as well as Update if not an Editor
  - [ ] Disable team name editing and podcast control if not owner
- [ ] Disable trash icons if not owner and not self
- [ ] All calls to services should handle errors so that they propagate to the user through messageService, unless we want services to handle them
- [ ] Add cloudflare between user and S3
- [ ] Add thumbnail support
- [ ] Prevent email from being used as a username

## Refactoring

- [ ] Go make sure that all subscriptions are unsubscribed
- [ ] Replace all messages with new messaging infrastructure and remove clears
- [ ] Search for throwError or .apollo. and use new Apollo
- [ ] Add Job Table with URL query params that update as table is filtered
- [ ] Add job scheduling with time based jobs

## Ideal Enhancements

- [ ] Add voice selection with different costs (e.g ElevenLabs, OpenAI)
- [ ] Add Articles filter as a query param (so that we can deep link to a specific filter, back works, etc.)
- [ ] Add blog post generator

## Possible Enhancements

- [ ] Adopt this menu: https://m3.material.io/get-started
- [ ] Code only (friends) invites, build graph of users and their invites
- [ ] Replace all messages with `@angular/localize` and `@angular/localize/init`???
- [ ] Make `npm run generate` work to convert schema to types, or find a way to use them from the schema directly!?
- [ ] Add foul language check for names, and articles?
- [ ] Add image review process?
- [ ] Add custom URL (to scrape) but scoped to this user only
- [ ] Get pre-commit stuff working, with 90% coverage, formatting, copyrights, etc.
  - [ ] Add copyright check script
  - [ ] Add 90% coverage
- [ ] Remove jest if possible
- [ ] Then add posthog
- [ ] Switch to new inject syntax and try to remove all usages of `rxjs`
- [ ] Consider ad supported free version? where products are part of outputs
- [ ] Determine if this code is needed in the `angular.json` file:
```
            "stylePreprocessorOptions": {
              "includePaths": [
                "src/styles"
              ]
            },
```
- [ ] Determine if Telegram has monetized API

## Testing

- [x] RSS Podcast feed
  - [ ] Add to Apple
  - [ ] Add to Spotify
  - [ ] Add to Google
  - [ ] Add to iHeartRadio

## Done

- [x] Add multiple channel publishing on TG to team
- [x] Move all news summary error handling to news summary function instead of returning Blocked
- [x] Add RSS feeds to teams
- [x] On Article list page add a team filter
- [x] Add RSS feed customization and to team
- [x] Add GUID to audio files in podcast
- [x] Check if image preview is working
- [x] On news list update filter is no longer applied
- [x] Add delete account
- [x] Add delete team
- [x] Add intro, outro, and prompt to Team
- [x] Add team to article detail page
- [x] Cancel Pending Jobs
- [x] Publish debounce
- [x] Paginate Articles
- [x] Audio generation to jobs infra (pass in article ID)
- [x] Add a podcast page (added to team page)
- [x] After job updates reload content or control subcomponent rerender
- [x] Add job status as banner component
- [x] Paginate Jobs
- [x] Create existing user error is not displayed
- [x] Create user with existing email is allowed, need to block
- [x] Format register
- [x] Add link to terms and privacy policy
- [x] Add checkmark to record if they accept on account create
- [x] Delete user and make sure the API stops working
- [x] Add env support, and switch testing users to come from env
- [x] Verify email before access
- [x] On landing but login required add a next query param to redirect to after login
- [x] Password change fields don't match there isn't an error in JS
- [x] Fix on fetch clears summary
- [x] On logout and email change, update toolbar (username goes stale)
- [x] Allow for a user to change their email (need to determine new verify flow through APIs)
- [x] Paginate News - get filtered news to reduce load on server
- [x] No personal info in name, no email check, add warning for publicly visible
- [x] Hide Forgot Password link and add to login page
- [x] Add a forgot password page
- [x] Edit user info
- [x] Finish switching all GQL calls to Apollo
- [x] Add a stored value for the user to accept the terms and privacy policy
- [x] Password reset link is wrong in email... how'd that break?
- [x] Forgot password page autocomplete is wrong - it thinks it is current-password not new-password
- [x] Add team Member Username is auto completing with email
- [x] Login form says username but it is email
- [x] Debug fetch news
- [x] On summarize create article
- [x] Display article
- [x] Add audio conversion
- [x] Check-in these changes, review, etc.
- [x] Add changelog script and CHANGELOG
- [x] Remove description logic from article summary
- [x] Can we move OpenBB to a separate service/end-point? (disabled for now)
- [x] Material UI
- [x] Dark Mode/Theme (local storage -> DB w/ login)
- [x] Cookies

[ANGULAR.md](notes%2FANGULAR.md)
[APEXCHARTS.md](notes%2FAPEXCHARTS.md)
[APOLLO_ANGULAR.md](notes%2FAPOLLO_ANGULAR.md)
[CREATION.md](notes%2FCREATION.md)
[DEVELOPMENT.md](notes%2FDEVELOPMENT.md)
[HTML_DOM.md](notes%2FHTML_DOM.md)
[MATERIAL.md](notes%2FMATERIAL.md)
[PROMT.md](notes%2FPROMT.md)

# TODO: Finance
- [ ] Watchlists
  - [ ] Auto add on view
  - [ ] Collaboration on watchlists, and due diligence
  - [ ] Alert on watchlist, TSLA crossed 200 day moving average and this has a 70% win rate
  - [ ] This should feel like they just got alerted "You looked at TSLA and it just...", but use normal watchlist alerts
- [x] Squeeze Indicator
  - [x] Momentum Histogram
  - [x] Setting Up Squeeze Indicator
  - [x] ATR Indicator 1x, 2x, 3x
- [x] Earnings
- [ ] Sector, Sub-sector/Industry, Indexes, ETFs
- [ ] Multi-time Frame Squeeze
- [ ] Option Spread Alerts
  - [ ] Option price over time as chart (bid, ask, mid)
  - [ ] Buy option vs. Buy underlying: break-evens, how long until option is more profitable, % gains on same investment
- [ ] SSO
- [ ] Payments w/ free code
- [x] Auto-Complete Stock/Ticker with company name search
- [ ] News (Z)
- [ ] Comps
  - [ ] TSLA had bad numbers for the last 4 quarters, so future numbers are going to be relatively good
- [ ] Fundamentals Drill Into
  - [ ] Balance Sheet Chart (Book -> Market, click: Cash, Inventory, etc.)
  - [ ] Income Statement Chart / Cash Flow Chart
- [ ] Economic Calendar for Exchange/Google Calendar -> A URL
  - [ ] Earnings
  - [ ] Dividends
  - [ ] Economic Events -> CPI, PPI, PCE, GDP, etc. ?ISM?
  - [ ] IPOs
  - [ ] Splits
  - [ ] Mergers
  - [ ] Acquisitions
  - [ ] Ex-Dividend
  - [ ] Ex-Splits
  - [ ] Ex-Mergers
  - [ ] Ex-Acquisitions
  - [ ] Ex-All
  - [ ] FED Events
- [ ] Stock Revenue is down, why?
  - [ ] Perform the fundamental analysis to show (revenue, earnings, etc.)
  - [ ] Then analyze stock news around this to figure out why

Pot odds on dashboard
- This strat that is triggering has a X% of winning
- What is this setups edge?

- AI is where the money is because it is where all of these companies can insert suggestions and make money off of it.
  - If they suggest AI solutions on their own platform, they can make money off of it.

# TODO After Alpha
- [ ] Look at DXCharts or the new Apache one!
