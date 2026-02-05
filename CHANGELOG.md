# Changelog from v0.29.0 to v0.30.0

This release introduces a comprehensive audio content management system with text-to-speech capabilities and queue management, alongside improvements to pulse content handling, social media integration, and several critical bug fixes for date display and account security.

## Enhancements

- Added audio player integration with queue management functionality for managing playback across the application
- Implemented recordings management system with custom text-to-speech creation capabilities
- Added job chain grouping UI with health checks and GraphQL transport support
- Introduced voice selector component for managing TTS voice preferences with persistent audio player
- Added smart media tab redirect functionality to improve navigation within pulse content
- Implemented automatic stale chunk detection and recovery for improved reliability
- Added social media preview tools with SEO metadata for affiliate landing pages to enhance social sharing capabilities
- Updated brand logo with enhanced contrast and white overlay layer
- Improved stock search user experience with audio player queue integration
- Added SSR development configuration to support server-side rendering workflows
- Enhanced pulse content management with better organization and media handling

## Bug Fixes

- Fixed daily chart date display to prevent timezone-based date shifting issues
- Fixed account security by requiring email confirmation for account deletion and implementing auto-generated usernames

## Cleanups

- Consolidated development tools into shared footer navigation for better organization
- Extracted voice selector into shared component for code reusability
- Moved user-specific copilot instructions out of project directory
- Added gitignore rules to prevent browser profile data leaks


# Changelog from v0.28.1 to v0.29.0

This release introduces a comprehensive terminal interface with AI-powered autocomplete, real-time WebSocket updates, and interactive charting capabilities. Major improvements include progressive chart data loading, currency handling for international stocks, DCF valuation analysis, and affiliate revenue visualization using ECharts.

## Enhancements

- **Terminal Interface**: Added AI-powered terminal with real-time stock charts, WebSocket-based autocomplete, command history navigation (rolodex-style), keyboard shortcuts, and FQN (Fully Qualified Name) format for symbol identification
- **Chart Improvements**: Implemented progressive data loading with free zoom navigation, volume bars, extended hours support and shading, timezone handling, crosshair instant response, user preferences with backend sync, and URL persistence for period selection
- **Stock Data Features**: Added currency handling and formula displays for international stocks, comprehensive fundamentals visualization with new charts and metrics, and DCF valuation analysis with interactive charts
- **Watchlist Enhancements**: Introduced sector, industry, and exchange watchlists with pagination, hierarchical menu navigation, rename/duplicate/delete actions, market cap sorting, and stock search capabilities
- **Real-time Updates**: Replaced job polling with WebSocket-based real-time monitoring, added real-time quote subscriptions with symbol filtering, and improved job status displays with stock symbol support
- **Affiliate Features**: Added ECharts-based revenue flow visualization (sankey charts), custom affiliate messages, commission showcase with professional terminology, and SSR support for landing pages with dynamic meta tags
- **Authentication**: Implemented automatic token refresh with rotation support, refresh token awareness in state handling, and token refresh telemetry
- **UI/UX Improvements**: Added theme showcase, redesigned status badges with outlined translucent style, prevented theme flash on page load, comprehensive favicon generation system, improved newsletter unsubscribe flow, and added transaction list filtering with detailed breakdown
- **Podcast Features**: Added AI-powered cover image generation with history tracking and created date column to podcast lists
- **Documentation**: Reorganized structure with consolidated guides, added asset optimization guide with SVG compression tooling, shared test library documentation, and GraphQL WebSocket integration guides

## Cleanups

- Removed 110+ unused SCSS classes and updated build tooling
- Replaced custom markdown parser with marked library
- Standardized CSS property ordering across components
- Removed unnecessary Angular effect options
- Extracted reusable components (chart header, terminal views, FQN chip)
- Replaced Material form-field with native select for chart interval picker
- Simplified watchlist menu using Material Design submenu pattern
- Standardized GraphQL types with Node suffix for consistency
- Migrated command history to Relay-style pagination
- Replaced Telegram icon SVGs with Material inline SVG
- Removed Docker configuration initially, then re-added with improved placeholder handling
- Enabled Fetch API and normalized backend snake_case to camelCase
- Simplified job UUID extraction to use direct getter methods


# Changelog from v0.28.0 to v0.28.1

This release focuses on authentication improvements and URL structure modernization. The authentication system now includes automatic token refresh with rotation support and telemetry tracking, while URL paths have been refactored from short paths to semantic `/media` routes for better clarity.

## Enhancements

- Added automatic token refresh with rotation support and telemetry tracking for improved auth reliability
- Implemented comprehensive frontend trace sanitization system for better security
- Added schedule creation modal dialog for improved workflow management
- Integrated `marked` library to replace custom markdown parser for better standards compliance
- Added affiliate disclosure notice to landing page for transparency

## Cleanups

- Refactored URL structure from short paths to semantic `/media` routes
- Updated component styling and layout for consistency
- Fixed Homebrew installation command in setup documentation
- Increased component style budget from 21kB to 25kB to accommodate UI improvements


# Changelog from v0.27.0 to v0.28.0

This release focuses on a comprehensive migration to Material Design 3 (MD3), modernization of the authentication system, and significant architectural improvements including an upgrade to Angular 20.

## Enhancements

- **Material Design 3 Migration**: Complete redesign using MD3 color tokens, spacing system (8px/4px grid), and design patterns across all components, with automated theme generation from HCT palettes
- **Angular 20 Upgrade**: Migrated from Angular 19 to Angular 20 with Material 20, requiring Node 22
- **Authentication Overhaul**: Simplified auth system to use localStorage with Bearer tokens, replacing previous token storage implementation
- **Navigation Improvements**: Added finance module to main navigation, standardized all routes under `/media` prefix, and implemented signal-based page title system with automatic route integration
- **API Key Management**: Added comprehensive API key management system with simplified creation form (removed rate limit fields)
- **UI Redesigns**: 
  - Redesigned episode header with improved action layout and conditional sharing
  - Updated buttons to outlined style with smoked glass elevation
  - Transformed resource links into styled clickable tags
  - Improved hero section with contained CSS orbs animation (replaced p5.js)
  - Redesigned profile menu with better UI consistency
- **Error Tracking**: Added comprehensive frontend error tracking system
- **News Features**: Added fetch deduplication and improved site content handling in detail panels
- **GraphQL Migration**: Migrated affiliate landing page to GraphQL with error tracking

## Cleanups

- **Code Organization**: Major restructuring into feature-based directories (auth, finance, user, podcast, team, affiliate modules) and consolidated layout components
- **SCSS Improvements**: Enforced strict linting, flattened nested selectors, extracted reusable mixins for elevation and validation icons, removed `!important` declarations and `::ng-deep` usage
- **Style Standardization**: Consolidated metadata display using Material icons, standardized border-radius values, replaced inline styles with utility classes, migrated to CSS custom properties
- **Routing Cleanup**: Removed route icons, standardized navigation item heights, added explicit menu visibility controls
- **Component Cleanup**: Moved all dialog components to dedicated folders with external template and style files, consolidated job status styles
- **Documentation**: Reorganized documentation structure, consolidated MD3 theme documentation, improved README
- **Testing**: Enhanced test coverage with proper mocks for services (TokenStorageService, ToolbarService, Apollo queries) and component dependencies
- **Build Tools**: Added CSS size tracking tools, palette generator script (`yarn theme:generate`), and MD3 linting
- **Removed**: Deleted backup directories, archived application code, and deprecated CSS utility classes


# Changelog from v0.26.0 to v0.27.0

This release introduces a comprehensive affiliate program with Stripe Connect integration, migrates authentication to OAuth2 with PKCE flow and GraphQL API, and implements a policy management system including cookie consent and terms acceptance. Additionally, the update adds public podcast pages with SEO optimization, RSS feed health monitoring for news sources, and significantly refactors URL routing to use shorter paths.

## Enhancements

- Implemented complete affiliate program with cash payouts via Stripe Connect, eligibility requirements, code management, credit conversion, and comprehensive admin controls
- Migrated authentication system to OAuth2 with PKCE flow and GraphQL API with backward compatible route aliases
- Added policy management system with cookie policy, terms acceptance tracking, newsletter subscriptions, and session-based caching
- Introduced public podcast, episode, and category pages with SEO metadata and camelCase JSON responses
- Added RSS feed health monitoring with status tracking, filtering capabilities, and research URL tracking for news sources
- Implemented platform financial status dashboard and admin payout management interface
- Added podcast view tracking and multi-level sorting criteria
- Introduced resizable news detail panel with markdown support, categories, tags, and improved responsive layout
- Added custom MP3 upload capability for podcast episodes with indicators
- Implemented newsletter subscription system integrated with policy acceptance
- Added SpectaQL for GraphQL API documentation generation
- Enhanced registration flow with phone number collection, terms acceptance, and double-submit prevention
- Added relay cursor pagination base class for consistent server-side pagination
- Implemented comprehensive filtering for podcasts and episodes with default dropdowns
- Added return URL persistence across authentication flows

## Refactorings

- Consolidated policy fetching into single service and migrated caching to Apollo with auth-aware clearing
- Streamlined URL routing by shortening paths (e.g., `/episode` to `/e`, authenticated routes to short paths)
- Migrated podcast history to localStorage and improved form controls
- Extracted episodes table and affiliate admin features into reusable components
- Centralized affiliate credit conversion logic and switched to PublicUser type
- Reorganized podcast routes for better navigation consistency
- Converted site statistics to camelCase naming convention
- Improved cookie banner and policy guard with better logging and code organization
- Enhanced news component styles and layout with markdown support
- Extracted episode version control into dedicated component

## Fixes

- Corrected affiliate terms validation to check against current policy version
- Prevented infinite loops in policy acceptance checks
- Fixed sidebar visibility detection for `/p` route
- Prevented news card title overflow with text truncation
- Prevented duplicate job completion notifications with improved message tracking
- Fixed markdown to HTML rendering issues
- Corrected episode detail form submission and grid view button behaviors
- Fixed podcast image upload response validation

## Cleanups

- Removed debug console.log statements throughout application
- Removed backend sync from cookie consent service
- Removed news source field from episode detail view
- Removed unused code and improved code organization


# Changelog from v0.25.0 to v0.26.0

This update introduces comprehensive episode management capabilities, including validation tracking, content search, and enhanced metadata display, alongside improved job list visualization and memory management features.

## Enhancements

- Added copy current content to memory button for improved content management
- Implemented dirty episode checks with automatic refresh for audio and image assets
- Added episode validation tracking including conforming status, facts verification, and length validation
- Introduced podcast episode search functionality with pagination support for browsing podcast content
- Added word count tracking for podcast episodes
- Enhanced episode metadata display to show current validation notes and version creator information
- Improved topic presentation by exposing linked episode relationships
- Added progress indicators to message displays for better user feedback
- Reduced height of job list resources for more compact visualization
- Updated home page to conditionally display title based on login status

## Cleanups

- Fixed podcast filters to retrieve all available results
- Increased style file error handling capacity


# Changelog from v0.24.1 to v0.25.0

In this update, we've introduced versioned many new AI Agents for deep research, news validation, and one to automate podcast creation. We added versioned episodes, and ability to create custom research topics for deep dives, and added research to our scheduling service.

## Enhancements
- New copy and image added to the home page.
- Version support for episodes introduced.
- Resource badges added to jobs.
- Most pages now use the layout loading spinner.
- Podcast generation from description feature added.
- "Research" removed from Topics menu item, and News styling changed.
- "Process News" button style matched, and topics initial status converted to "Not Started".
- Live status now visible on the episode list.
- News job validation support and process news GQL support added.
- PublishResearchTopicEpisodeChain support added to research service.
- Ability to create new topics added and job status bar moved to layout.
- Stats switched to use no auth and landing page now uses this new API.
- When a topic completes, it now fetches the episode title (in addition to the topic title).
- Research topics feature added.

## Cleanups
- Home page now correctly uses the podcast thumbnail URL instead of image.
- "Start Automating Now" button text fixed to stay white in light mode.
- Stats titles fixed.
- Rubberbanding when editing transcript prompt fixed and Research job name changed.
- Research now keeps the podcasts submenu open.


# Changelog from v0.24.0 to v0.24.1

In this update, we've fixed some issues and introduced new features to enhance the user experience. The team link on the podcast page now works as expected, and the floating buttons are now visible. We've also made the news section scrollable. On the feature side, we've updated the deprecated setOptions to the new refetch and sorted jobs to show completed ones first. Additionally, selecting a podcast in the news component now triggers a fetch, and the podcast dropdown loading now has a spinner.

## Enhancements
- Updated the deprecated setOptions to the new refetch.
- Sorted jobs to show completed ones first.
- Selecting a podcast in the news component now triggers a fetch.
- Podcast dropdown loading now has a spinner.

## Fixes
- Fixed the team link on the podcast page to work as expected.
- Made the floating buttons visible.
- Made the news section scrollable.


# Changelog from v0.23.0 to v0.24.0

This update introduces several new features and improvements to the podcast list component, news detail section, and the message component. It also includes a fix to the auto-save feature.

## Enhancements
- Added a feature to create new and empty episodes to the podcast list component.
- Made the news detail section sticky and show from top to bottom.
- Added Markdown to HTML conversion using 'marked' and displayed AI summary of news using it.
- Decoupled the cache policy customization from GraphQL provider via cache policies registry.
- Added a progress bar to the message component and enabled parallel multiple RSS feed loading.
- Made podcast intro, outro, and prompt auto resize.
- Increased intro and outro text field heights.
- Simplified the create new podcast dialog by removing categories.
- Converted terms and conditions as well as privacy policy to new page loading from termly.

## Cleanups
- Fixed the auto-save feature to work as expected while editing podcast fields and button updates.


# Changelog from v0.22.0 to v0.23.0

In this update, we have introduced a new feature that exposes the test raise and test print task for debugging purposes, as well as limiting scheduled tasks to the latest episode with audio. Additionally, we have upgraded the eslint dependency to resolve issues with the nrwl dependency.

## Enhancements
- A new feature has been added that exposes the test raise and test print task for debugging.
- The task scheduling is now also limited to generating the latest episode with audio (single step tasks are removed).

## Cleanups
- The eslint dependency has been upgraded to fix issues with the nrwl dependency.


# Changelog from v0.21.1 to v0.22.0

In this update, we've introduced new features and improvements to the job service, podcast functionalities, and user interface. We've also made some cleanups and bug fixes to enhance the overall performance of the application.

## Enhancements
- Added the delete episode service connection and dialog.
- Introduced a 'load more jobs' button.
- Enabled loading of all kinds of jobs in the job service.
- Added support for new job return values to link to objects etc.
- Implemented support for select unused and publish episode audio job kinds.
- Introduced theme colors usage guide and implemented CSS custom properties for light and dark themes.
- Renamed podcast save button, removed tooltips layout icons, and started to remove dynamic fill styles.
- Added skeleton loading for stats cards in the home component.
- Integrated Relay support and enhanced podcast functionalities.
- Finished integrating 0.21.0 changes, added prelogin layout, and shared footer.
- Added support for thumbnails on podcast grid and list view.
- Introduced a 'create blank episode' button in the news page and a category button in the create podcast modal.
- Made improvements to the podcast detail page, user interface, and responsiveness.
- Revamped login, accounts, and other pages.
- Included sidebar as per figma.

## Cleanups
- Moved export-account-dialog to a separate folder structure with separate HTML and SCSS files.
- Hid the Telegram Channel ID by default.
- Centered and contained thumbnails on podcast grid view.
- Converted podcast list component table to display team name instead of owner.
- Fixed eslint error and resolved lint issues.
- Improved podcasts pages.


# Changelog from v0.21.0 to v0.21.1

In this update, we have embedded and updated the terms and conditions as well as the privacy policy for the site.

## Enhancements
- Embedded and updated the terms and conditions and privacy policy for the site.

## Cleanups
No significant cleanups were made in this update.


# Changelog from v0.20.0 to v0.21.0

In this update, we've introduced new features to enhance security and improve the user interface, as well as performed some cleanups to optimize the application's performance.

## Enhancements
- Introduced a new feature that invalidates old tokens whenever a password change occurs, enhancing the security of user accounts.
- Exposed podcast descriptions, fixed order/code pagination, added a blank episode feature, and included a refresh/delete job list to improve user interface and functionality.

## Cleanups
- Updated the application schema for better data management.
- Removed the hard-coded testing voice from default settings to optimize the application's performance.


# Changelog from v0.19.0 to v0.20.0

This update introduces several enhancements and fixes to improve the podcast feature, voice controls, and category management. 
It also includes a few cleanups to optimize the application's performance.

## Enhancements
- Add ability to customize Podcast voices and import voices from ElevenLabs and OpenAI.
- Added categories to podcasts and cleaned cost per credit calculations.
- Improved News summarization by an order of magnitude using concurrent processing.
- Delayed podcast auto-save to 3 seconds to reduce thrashing.
- Added refresh voices feature.
- Added auto-save to podcast settings and rearranged into sections.
- Introduced voice dialog with the ability to add shared voice IDs or import PVCs.
- Introduced the ability to delete podcast image.

## Cleanups
- Fixed the retry job function to correctly pass the job UUID.
- Fixed job statuses/kind/uuid for retry and delete.
- Removed transaction from refresh and cancel orders.


# Changelog from v0.18.0 to v0.19.0

This update primarily focuses on integrating Relay support, enhancing podcast and team functionalities, and refining transaction handling. 

## Enhancements
- Integrated Relay support with codes, transactions, podcasts, episodes, and jobs.
- Added ability to change podcast team and display podcasts in team detail view.
- Enabled selection or creation of team when creating a podcast.
- Updated episode and podcast details icons.
- Rearranged menu items and added save button to team.
- Adopted API changes to switch from Team to Team and Podcast and from Article to Episode.

## Cleanups
- Fixed routing of users to login after register.
- Stopped exposing all transactions for each order.
- Fixed getTeams to return RelayConnection type.
- Corrected job status bar messages.
- Renamed CreditTransaction to Transaction.
- Switched create stripe checkout session to return an order.
- Showed associated podcasts that will be deleted with users and teams.
- Fixed update podcast to use podcastId and user drop-down to refresh after load with only 3 chars.
- Fixed update GQL and redeem code input.


# Changelog from v0.17.0 to v0.18.0

In this update, we have integrated GraphQL updates for ID to UUID migration and improved error handling during login. We have also removed unused stock/finance components and updated the onboarding documentation. Additionally, we have added copyrights and checks, and removed the old open source license as this project is closed source.

## Enhancements
- Integrated GraphQL updates for ID to UUID migration
- Improved error handling during login
- Watch queries reset on logout
- Removed schedule

## Cleanups
- Removed unused stock/finance components
- Updated the readme and notes for onboarding
- Added copyrights and checks
- Removed old open source license, this project is closed source


# Changelog from v0.16.0 to v0.17.0

In this update, we have integrated stripe payments, a credit transaction and bonus code system, and exposed article generation without audio.

## Enhancements
- Integrated Stripe payments to purchase credits.
- Introduced a purchase orders table with refresh and cancel options.
- Introduced a transactions table, and displayed credit balance in the toolbar.
- Added bonus code redeem to the user details page.
- Added a button to generate articles without audio.
- Made the home page have an interactive wave and simplified messaging.
- Added job cost and transaction job for better financial tracking.

## Cleanups
- Forced cache refresh after audio generation job finishes to ensure up-to-date data.
- Job status is now only refreshed if the user is logged in.


# Changelog from v0.15.0 to v0.16.0

In this update, we've introduced custom RSS Feed support and different news time frames. We've also enhanced the audio feature by converting audioBase64 to an audioUrl and added support for podcast owner details. Additionally, we've improved image reloading and made navigation links more user-friendly. Lastly, we've removed and renamed all crypto references to ensure news and articles cater to a wider range of topics.

## Enhancements
- Added custom RSS Feed support and support for different news time frames.
- Converted audioBase64 to an audioUrl and added support for podcast owner name, email, and link.
- Made navigation links compatible with CTRL+Click and right mouse button (RMB) open in new tab.

## Cleanups
- Fixed an issue where images were reloading multiple times on hover, reducing it to 2 reloads.
- Removed and renamed all crypto references to ensure news and articles cover a broader range of topics.


# Changelog from v0.14.0 to v0.15.0

In this update, we've removed the charts feature (for now), added support for GraphQL file uploads, and introduced podcast image and description.

## Enhancements
- Added support for GraphQL file uploads, allowing users to upload files directly through the GraphQL API.
- Introduced podcast image and description, providing more information about the podcasts available on the platform.
- Convert HttpInterceptors to using ApolloAuthMiddleware with ApolloLink so that the new ApolloUploadClient could be used for image/file uploads
- Increases job polling interval to 21s.
- Update copyright in layout to include 2025.
- Make logo and site title a link.
- Add podcast image and description support.

## Cleanups
- Remove apexcharts and all charting components.
- Remove UserService from AuthService (circular dependency).
- Remove AuthInterceptorService.


# Changelog from v0.13.2 to v0.14.0

This update introduces the ability to export personal user data, delete users and teams, and includes a fix for team slug and RSS settings.

## Enhancements
- Added support for personal data export, allowing users to download their own data.
- Introduced the ability to delete both users and teams, providing more control over account management.
- Improved user details handling by reloading user details on password changes for managers.

## Fixes
- Corrected an issue in Team settings where the save button was disabled when both slug and RSS copy were enabled. Now, the save button correctly reflects the "dirty" state of the form.


# Changelog from v0.13.1 to v0.13.2

In this patch update, we have fixed a loop in the article page and changed the default publish team to 'none' to make publishing more intentional.

## Enhancements
No new enhancements were added in this update.

## Cleanups
- The default publish team has been set to 'none'. This change has been made to make the publications more intentional and prevent unintended publications.
- We have fixed a loop in the podcast enabled update. This will prevent the application from getting stuck in a loop, thereby improving its performance and reliability.


# Changelog from v0.13.0 to v0.13.1

In this patch update, we have improved the podcast slug and URL interaction and added a new feature to allow users to update the podcast slug and URL. Additionally, we have made some enhancements to the user interface and added new standard operating procedures (SOPs) to guide users through the application.

## Enhancements
No new enhancements were added in this update.

## Cleanups
- Removed the update team checks for staleness. This change was made to improve the efficiency of the application by eliminating unnecessary checks.
- Disabled slug and URL immediately. This was done to prevent any potential issues or errors that could arise from these features.
- Added Standard Operating Procedures (SOPs). This addition will help guide users through the application and provide a more streamlined experience.


# Changelog from v0.12.1 to v0.13.0

This update adds the ability to publish articles to custom Telegram channels and groups and adds control for which articles are published to the podcast RSS feed.

## Enhancements

- A word count feature has been added to the article details content field, providing users with a quick overview of the length of each article.
- We've introduced new fonts to improve readability and overall aesthetics of the application.
- The article detail buttons and list have been cleaned up for a more streamlined user interface. Additionally, issues with the team slug and RSS URL being hidden have been fixed.
- We've expanded our publishing options to include podcasts and Telegram per team, offering more ways for users to access and share content.
- To enhance the user experience, we've added Telegram input fields and made it so that the call to action is hidden on the home page for logged-in users.

## Cleanups

- We've refactored the user detail changes to use our new messages infrastructure, resulting in a consistent and reliable system.
- To improve the performance and readability of our code, we've removed numerous console.log statements and updated comments throughout the codebase.


# Changelog from v0.12.0 to v0.12.1

This update primarily focuses on fixing issues related to the audio generation on the article page and the replacement of special characters during article updates.

## Enhancements
- The audio generation on the article page has been improved. Previously, it was only using the chain infrastructure. Now, it has been fixed to utilize the jobs infrastructure, which should enhance the overall performance and reliability of the audio generation process.

## Cleanups
- An issue where special characters were being replaced during article updates has been resolved. This fix ensures that the content integrity is maintained during the update process, allowing special characters to be preserved as intended.


# Changelog from v0.11.0 to v0.12.0

In this update, we've exposed the intro, prompt, and outro to teams. We've also added pagination support to crypto articles along with jobs infrastructure support for article audio generation.

## Enhancements
- Article Detail Update: We have added a feature that refreshes article audio toolbar once a job is completed.
- Teams Introduction and Outro: We have introduced a new feature that adds an introduction, prompt, and outro to teams.
- Crypto Articles Pagination: To improve the user experience and reduce server load, we have added pagination support to crypto articles.
- Crypto Article Audio Generation: We have converted the crypto article audio generation to use jobs infrastructure.

## Cleanups
No significant cleanups were made in this update.


# Changelog from v0.10.1 to v0.11.0

In this update, we have introduced the concept of podcast feeds which are owned by teams and can be subscribed to by
users. This feature allows audio generation to automatically be served to users who have subscribed to a podcast feed.

## Enhancements
- Podcast RSS Feed Support: Added the ability to create podcast feeds that are owned by teams and can be subscribed to
  by users.

## Cleanups
No cleanup changes were made in this update.


# Changelog from v0.10.0 to v0.10.1

This update primarily focuses on improving the stability of the application by addressing an issue related to invalid local storage values. 

## Enhancements
No new enhancements were introduced in this version.

## Fixes
- Invalid local storage values are now handled properly through a sanitization process, ensuring the application's performance and reliability.

## Cleanups
- Version bump to v0.10.1.


# Changelog from v0.9.0 to v0.10.0

This update brings a number of enhancements and fixes to the financial research web application. The main focus of this update is the integration of a new jobs infrastructure, which has been applied to various features such as the creation of crypto articles, extraction of news, adn summarization of news. User permissions have been improved, and the user interface has been refined with the addition of sorting and pagination to a new jobs table. Several bugs have also been addressed in this update.

## Enhancements
- Added a new feature for creating a chain of Jobs (e.g. one click to create new crypto articles).
- Converted the creation of crypto articles, the extraction of news, and summarize news to use the jobs infrastructure.
- Added Jobs page with table that has sorting functionality and pagination.
- Added user permissions from Django user info and switched the user to use the base service.
- Moved more Apollo calls to using base service for more consistent errors and reduced code duplication.
- Added the Job Status Bar, job complete hook, and job polling.
- Added tool generated schema.graphql from back-end schema to improve the front-end types.

## Cleanups
- Fixed an issue with the bottom sidenav where the mode over was not using the expanded the menu.
- Addressed an issue with cookie consent local storage getting cleared after logged out.
- Fixed issues with team detail user autocomplete, password change error messages, and reset password validation messages.


# Changelog from v0.8.0 to v0.9.0

This update brings a host of new features and improvements to the application. The user interface has been enhanced with the addition of a profile page, allowing users to update and view their information. Team functionality has been expanded, with the ability to add teams to articles, select teams during article generation, and display team members in a collapsed table format. A dialog for adding and removing owners has also been introduced. 

## Enhancements
- Added support for email changes.
- Implemented a feature to send support email destination requests for publishing until per teams telegram bots are supported.
- Introduced a profile page for updating and viewing user information.
- Added the ability to add teams to articles.
- Included team selection in the article generation process.
- Displayed team members as a collapsed table.
- Added a dialog for adding and removing owners.
- Introduced upsert, remove user from team, and user autocomplete features.
- Added Read, Create, and Update Teams functionalities.
- Rerouted after login and fixed article list spinner.
- Provided a link instead of routing to an article and fixed the message bar.
- Implemented news regeneration and redirection on articles.
- Changed the card background.
- Added a 12-hour select feature and made summarize do only that.
- Added a not search feature.
- Broke the summary into three pieces: extract, summarize, and create an article.
- Added a news summary display in the expansion panel.

## Cleanups
- Fixed the regenerate button for news.


# Changelog from v0.7.0 to v0.8.0

The new version v0.8.0 brings a number of enhancements and fixes to improve the user experience and functionality of the financial research web application. 

## Enhancements

- Article titles have been updated and now show news images, providing a more engaging and informative user experience.
- New material icons have been added, along with error handling for audio and articles, new settings, and cookies consent.
- A feature to publish crypto news articles has been introduced.
- Support for generating audio, playback, and downloading has been added, enhancing the accessibility and usability of the application.
- The theme is now a signal which is loaded from user preferences, and a user preference service has been added.
- Articles and clean messages have been added, charts have been hidden, focus has been moved to autocomplete, and the icon has been moved to the top right.
- Article list and detail components have been added, along with article updating.
- Crypto news fetch, get, and summarize features have been added, expanding the range of financial news available to users.

## Cleanups

- The 'forgot password' feature no longer redirects to login via the theme preference endpoint, improving the user experience during password recovery.
- News is now reloaded after fetch, ensuring users always see the most recent news.
- Fetch and summarize have been converted to mutations, improving the efficiency and performance of these operations.


# Changelog from v0.6.0 to v0.7.0

In this update, we've made several enhancements and cleanups to improve the functionality and security of our financial research web application.

## Enhancements
- A new feature has been added to synchronize authentication interceptor URLs with the authentication service. This enhancement will ensure that the application's security is always in sync with the authentication service.
- We've also added new authentication components to further strengthen the security of the application.
- A new message service has been introduced. This service will improve the communication within the application, making it more efficient and user-friendly.
- The email now pulls through on reset forms, providing a more seamless user experience during password resets.

## Cleanups
- We've updated the dependencies for axios to version ^1.7.4 to address the security vulnerability CVE-2024-39338. This cleanup will ensure that the application is protected against this specific security threat.
- We've added an activated route mock to tests. This cleanup will improve the accuracy of our testing and ensure that the application's routing is functioning as expected.


# Changelog from v0.5.0 to v0.6.0

In this update, we have made several enhancements and cleanups to improve the functionality and performance of our financial research web application.

## Enhancements

- We have improved the routing mechanism after password reset. Now, users will be directed to the login page after resetting their password, providing a smoother user experience.
- We have also enhanced the registration response by adding access and refresh back. This will ensure a more secure and efficient user registration process.
- The 'forgot password' component has been updated to no longer route to the login page for 'forgot' APIs. Additionally, the 'forgot password' link has been relocated for better accessibility.

## Cleanups

- We have removed the hardcoded localhost and switched to a URL for the API. This change will enhance the flexibility and scalability of the application.
- The production environment file replacement has been disabled, and the production environment file has been removed. This will help in maintaining the integrity of the production environment.
- We have increased the bundle size for the initial deployment. This will help in improving the performance of the application during the initial deployment.


# Changelog from v0.4.0 to v0.5.0

This update brings a host of new features, enhancements, and cleanups to the financial research web application. The application now includes a forgot password component, disclaimers to register and footer, and a register feature. The Dashboard has been renamed to Charts and support for autocomplete to submit raw value has been added. The application now also includes a privacy policy, terms and conditions views, and a cookie banner. The toolbar service has been added and component references in the toolbar service are now supported. The application now uses Material Design 3 themes and displays earnings data in an accordion. The update also includes a number of fixes and cleanups.

## Enhancements
- Added forgot password component
- Added disclaimers to register and footer
- Added register feature
- Renamed Dashboard to Charts
- Added support for autocomplete to submit raw value
- Added privacy policy and terms and conditions views
- Added cookie banner
- Added toolbar service and support for component references in the toolbar service
- Added Material Design 3 themes and display of earnings data in an accordion
- Added future earnings table to the landing

## Cleanups
- Moved init from view to OnInit
- Fixed remaining broken tests and refactored some code to support them
- Upgraded axios for CVE-2024-39338
- Fixed several tests for pre-commits and updated husky scripts
- Moved all template code to HTML files
- Removed the npm (package-lock.json) file in favor of yarn
- Upgraded dependencies to deal with vulnerabilities
- Removed angular/http dependency as it is not used anymore
- Switched to yarn



# Changelog from v0.3.0 to v0.4.0

In this update, we have made several enhancements to our financial research web application, focusing on improving the functionality and user experience of our charting features. 

## Enhancements
- **Support for Keltner Channels**: We have added support for Keltner Channels, a popular volatility indicator used in technical analysis of stock prices. This will provide users with more tools to analyze market trends and make informed trading decisions.
- **Hist Colors to Squeeze**: We have added hist colors to the squeeze indicator, making it easier for users to visualize and interpret the data.
- **Scroll Zoom and Grouped Axes**: We have added a scroll zoom feature and grouped the axes on the candle chart. This will allow users to zoom in and out of the chart and view different sections more easily. We have also added a horizontal line to the candle chart for better data visualization.
- **Scrollbar and Zoom Link Between Charts**: We have added a scrollbar and a zoom link between charts, allowing users to navigate through different charts more efficiently. This will enhance the user experience by making it easier to compare and analyze data from different charts.

## Cleanups
- **Squeeze Indicator Cleanup**: We have cleaned up the squeeze indicator, fixing minor issues and improving its overall performance. This will ensure that the squeeze indicator works smoothly and provides accurate data.


# Changelog from v0.3.0 to v0.4.0

In this update, we've made several enhancements to our financial research web application, focusing on improving the functionality and user experience of our charting features. 

## Enhancements
- **Support for Keltner Channels**: We've added support for Keltner Channels, a popular volatility indicator used in technical analysis of stock prices. This will provide users with more tools to analyze market trends and make informed decisions.
- **Hist Colors to Squeeze**: To improve the visual representation of the squeeze indicator, we've added hist colors. This will make it easier for users to interpret the squeeze indicator.
- **Scroll Zoom and Grouped Axes**: We've added a scroll zoom feature to the candle chart, and grouped the axes for better readability and navigation. We've also added a horizontal line to the candle chart for better visualization.
- **Scrollbar and Zoom Link Between Charts**: To enhance navigation, we've added a scrollbar and a zoom link between charts. This will allow users to easily compare different charts and indicators.
- **Clean Up Squeeze Indicator**: We've cleaned up the squeeze indicator, making it more streamlined and user-friendly. We've also added fixed (2) points for squeeze for better accuracy.

## Cleanups
- **Squeeze Indicator**: We've made some cleanups to the squeeze indicator, improving its functionality and user interface. This includes adding fixed (2) points for squeeze, which will provide more accurate and reliable readings.


# Changelog from v0.2.0 to v0.3.0

In this update, we have made significant improvements to our financial research web application. The primary change is the addition of the squeeze data feature, which is a crucial indicator used in technical analysis of stock prices. This new feature will enhance the user's ability to make informed decisions based on the latest market trends.

## Enhancements
- Added squeeze data feature for improved technical analysis of stock prices.

## Cleanups
- No cleanup changes were made in this version.
