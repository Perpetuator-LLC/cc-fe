#!/usr/bin/env python
"""
Setup OAuth2 Redirect URIs
This script updates the OAuth2 application to include all necessary redirect URIs
for development and production environments.

Usage:
    cd /path/to/capital-copilot-be
    python manage.py shell < setup_oauth_redirect_uris.py
"""

from oauth2_provider.models import Application

# Your OAuth2 Client ID from environment.ts
CLIENT_ID = 'BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME'

print("=" * 60)
print("OAuth2 Redirect URI Setup")
print("=" * 60)

try:
    app = Application.objects.get(client_id=CLIENT_ID)

    print(f"\n✓ Found OAuth2 application: {app.name}")
    print(f"  Client ID: {app.client_id}")

    # Current redirect URIs
    print(f"\n📋 Current redirect URIs:")
    if app.redirect_uris:
        for uri in app.redirect_uris.split():
            print(f"  - {uri}")
    else:
        print("  (none)")

    # Set redirect URIs for all environments
    app.redirect_uris = """http://localhost:4200/callback
https://capitalcopilot.io/callback
http://127.0.0.1:4200/callback"""

    app.save()

    print(f"\n✅ Successfully updated redirect URIs!")
    print(f"\n📋 New redirect URIs:")
    for uri in app.redirect_uris.split():
        print(f"  ✓ {uri}")

    print("\n" + "=" * 60)
    print("Setup complete! You can now use the OAuth demo.")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Start frontend: cd capital-copilot-fe && yarn start")
    print("  2. Navigate to: http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&clientId=" + CLIENT_ID)
    print("  3. Click 'Login with OAuth2'")
    print("\n")

except Application.DoesNotExist:
    print(f"\n❌ Error: No OAuth2 application found with client_id: {CLIENT_ID}")
    print("\nPlease create an OAuth2 application first:")
    print("  python manage.py shell")
    print("  >>> from oauth2_provider.models import Application")
    print("  >>> app = Application.objects.create(")
    print("  ...     name='Capital Copilot Frontend',")
    print("  ...     client_type=Application.CLIENT_PUBLIC,")
    print("  ...     authorization_grant_type=Application.GRANT_AUTHORIZATION_CODE,")
    print(f"  ...     redirect_uris='http://localhost:4200/callback\\nhttps://capitalcopilot.io/callback'")
    print("  ... )")
    print("  >>> print(f'Client ID: {app.client_id}')")
    print("\nThen update environment.ts with the new client ID.")
    print("\n")

except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\n")

