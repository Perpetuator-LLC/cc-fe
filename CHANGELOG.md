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
