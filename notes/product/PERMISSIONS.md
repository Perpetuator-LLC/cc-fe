# User Permissions

User permissions can be queried by the `permissions` field in the `User` type. The `permissions` field is a list of strings that represent the permissions that the user has. The permissions are defined in the `Permission` enum.

## Giving Permissions

Permissions can be given to a user by adding the permission string to the `permissions` field of the user. The permission string is the name of the permission in the `Permission` enum.

Just log into the admin site and add the permission to the user.

# Active Permissions

The currently in use permissions are:

- `api.change_cryptonews` - to show the button to regenerate the crypto news summary and display the scraped content from the site
