# Fonts

We use Dyslexia-friendly Fonts:
- Lexend
- Open Sans

## Adding Fonts

To add a Google Font to your Angular application, follow these steps:

1. **Select the Font on Google Fonts:**
  - Go to [Google Fonts](https://fonts.google.com/).
  - Select the font you want to use.
  - Click on the `+` button to add the font to your selection.
  - Click on the "Selected family" bar at the bottom of the page.
  - Copy the `<link>` tag provided in the "Embed" section.

2. **Add the Font to Your Angular Application:**
  - Open the `index.html` file in your Angular project.
  - Paste the copied `<link>` tag inside the `<head>` section.

   ```html
   <!-- index.html -->
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <title>My Angular App</title>
     <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" />
   </head>
   <body>
     <app-root></app-root>
   </body>
   </html>
   ```

3. **Use the Font in Your Styles:**
  - Open your `src/styles.scss` file.
  - Add the font-family to your CSS.

  ```scss
  // src/styles.scss
  body {
    font-family: 'Roboto', sans-serif;
  }
  ```

By following these steps, you will have integrated a Google Font into your Angular application.
