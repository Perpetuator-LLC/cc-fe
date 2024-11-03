# GPT

To assist in development of this project I created:
https://chatgpt.com/g/g-D8TyqKkaO-angular-18-coding-copilot

# Capital Copilot Front-End

- [ ] RSS Podcast feed
  - [ ] Add to Apple
  - [ ] Add to Spotify
  - [ ] Add to Google
- [ ] Add a podcast page

- [ ] Add delete account 
- [x] Fix on fetch clears summary
- [x] On logout and email change, update toolbar (username goes stale)
- [x] Allow for a user to change their email (need to determine new verify flow through APIs)
- [ ] Paginate News - get filtered news to reduce load on server
- [ ] No personal info in name, no email check, add warning for publicly visible
- [ ] Allow user to remove self from team
- [ ] Disable trash icons if not owner and not self
- [ ] Disable Publish if not publisher or greater and disable Create Article as well as Update if not an Editor
- [ ] Add foul language check for names, and articles?
- [ ] Add team to article detail page
- [ ] On Article list page add a team filter
- [ ] Add multiple channel publishing on TG to team
- [ ] Add ElevenLabs API Key to team
- [ ] Move all news summary error handling to news summary 
- [x] Remove description logic from article summary
- [ ] Add job scheduling with time based jobs
- [ ] Code only (friends) invites, build graph of users and their invites
- [ ] Can we move OpenBB to a separate service/end-point?
- [ ] Can we move LangChain and OpenAI to a separate service/end-point?]
- [ ] Add custom URL (to scrape) but scoped to this user only
- [x] Password reset link is wrong in email... how'd that break?
- [ ] Forgot password page autocomplete is wrong - it thinks it is current-password not new-password
- [ ] Add team Member Username is auto completing with email
- [x] Login form says username but it is email
- [x] Debug fetch news
- [x] On summarize create article
- [x] Display article
- [x] Add audio conversion
- [x] Check-in these changes, review, etc.
- [ ] Get pre-commit stuff working, with 90% coverage, formatting, copyrights, etc.
  - [ ] Add changelog script and CHANGELOG
  - [ ] Add copyright check script
  - [ ] Add 90% coverage
- [x] Hide Forgot Password link and add to login page
- [x] Add a forgot password page
- [x] Edit user info
- [x] Finish switching all GQL calls to Apollo
- [x] Add a stored value for the user to accept the terms and privacy policy
- [ ] Remove jest if possible
- [ ] Then add posthog
- [x] Create existing user error is not displayed
- [x] Create user with existing email is allowed, need to block
- [x] Format register
- [x] Add link to terms and privacy policy
- [x] Add checkmark to record if they accept on account create
- [x] Delete user and make sure the API stops working
- [x] Add env support, and switch testing users to come from env
- [x] Verify email before access
- [ ] Switch to new inject syntax
- [x] On landing but login required add a next query param to redirect to after login
- [ ] Consider ad supported free version? where products are part of outputs
- [ ] Determine if this code is needed in the `angular.json` file:
```
            "stylePreprocessorOptions": {
              "includePaths": [
                "src/styles"
              ]
            },
```
- [ ] Determine if Telegram has monitized API

[ANGULAR.md](notes%2FANGULAR.md)
[APEXCHARTS.md](notes%2FAPEXCHARTS.md)
[APOLLO_ANGULAR.md](notes%2FAPOLLO_ANGULAR.md)
[CREATION.md](notes%2FCREATION.md)
[DEVELOPMENT.md](notes%2FDEVELOPMENT.md)
[HTML_DOM.md](notes%2FHTML_DOM.md)
[MATERIAL.md](notes%2FMATERIAL.md)
[PROMT.md](notes%2FPROMT.md)

# TODO
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
- [x] Material UI
- [ ] SSO
- [x] Dark Mode/Theme (local storage -> DB w/ login)
- [x] Cookies
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
- [ ] Look at DXCharts
