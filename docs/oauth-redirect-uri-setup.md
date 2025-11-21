# OAuth2 Backend Setup - Redirect URI Configuration

## Problem

When clicking "Login with OAuth2" in demo.html, you get:
```
Error: invalid_request Mismatching redirect URI.
```

## Root Cause

The OAuth2 application on your backend must have the **exact** redirect URI registered that the frontend is sending.

## Solution

### Step 1: Check Current OAuth Application

On your backend server:

```bash
cd /path/to/capital-copilot-be
python manage.py shell
```

```python
from oauth2_provider.models import Application

# Find your application
app = Application.objects.get(client_id='BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME')

# Check current redirect URIs
print("Current redirect URIs:")
print(app.redirect_uris)
```

### Step 2: Update Redirect URIs

The redirect URIs should include **all** environments you'll use:

```python
# Update with both development and production URIs
app.redirect_uris = """http://localhost:4200/callback
https://capitalcopilot.io/callback
http://127.0.0.1:4200/callback"""

app.save()

print("✅ Updated redirect URIs:")
print(app.redirect_uris)
```

### Step 3: Verify Configuration

```python
# Verify the update
app.refresh_from_db()
print("\n📋 OAuth2 Application Configuration:")
print(f"Name: {app.name}")
print(f"Client ID: {app.client_id}")
print(f"Client Type: {app.client_type}")
print(f"Grant Type: {app.authorization_grant_type}")
print(f"\nRedirect URIs:")
for uri in app.redirect_uris.split():
    print(f"  ✓ {uri}")
```

## Expected Output

```
📋 OAuth2 Application Configuration:
Name: Capital Copilot Frontend
Client ID: BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME
Client Type: public
Grant Type: authorization-code

Redirect URIs:
  ✓ http://localhost:4200/callback
  ✓ https://capitalcopilot.io/callback
  ✓ http://127.0.0.1:4200/callback
```

## How demo.html Works Now

### Automatic Redirect URI Detection

The demo now **automatically** chooses the right redirect URI:

```javascript
// Development (localhost)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultRedirectUri = isLocalhost 
  ? `http://localhost:4200/callback`  // ← Auto-selected for dev
  : 'https://capitalcopilot.io/callback';  // ← Auto-selected for prod
```

### OAuth Flow

```
1. User clicks "Login with OAuth2" in demo.html
   ↓
2. demo.html saves config to sessionStorage
   ↓
3. Redirects to: http://127.0.0.1:8000/o/authorize/
   with redirect_uri=http://localhost:4200/callback
   ↓
4. User authorizes on backend
   ↓
5. Backend redirects to: http://localhost:4200/callback?code=ABC123
   ↓
6. callback.html receives code
   ↓
7. callback.html redirects to: demo.html?code=ABC123 (with saved config)
   ↓
8. demo.html exchanges code for access token
   ↓
9. ✅ User is logged in!
```

## Testing

### Test 1: Development

```bash
# 1. Start frontend
cd capital-copilot-fe
yarn start

# 2. Navigate to
http://localhost:4200/demo.html?apiUrl=http://127.0.0.1:8000&clientId=BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME

# 3. Check configuration display - should show:
#    Redirect URI: http://localhost:4200/callback

# 4. Click "Login with OAuth2"
# 5. Should redirect to backend authorization page
# 6. Authorize
# 7. Should redirect back to callback, then to demo with token
```

### Test 2: Verify Redirect URI Match

Open browser console before clicking "Login with OAuth2":

```javascript
// Check what redirect_uri will be sent
const urlParams = new URLSearchParams(window.location.search);
const isLocalhost = window.location.hostname === 'localhost';
const defaultRedirectUri = isLocalhost 
  ? `http://localhost:4200/callback`
  : 'https://capitalcopilot.io/callback';
  
console.log('Will use redirect_uri:', defaultRedirectUri);
```

This **must match** one of the URIs registered in the backend OAuth application.

## Manual Override (If Needed)

If you need a custom redirect URI:

```
http://localhost:4200/demo.html?redirectUri=http://localhost:4200/custom-callback&clientId=...
```

Just make sure the custom URI is also registered in the backend!

## Common Issues

### Issue: Still getting "Mismatching redirect URI"

**Solution 1:** Check for trailing slashes
```python
# ❌ WRONG - with trailing slash
app.redirect_uris = "http://localhost:4200/callback/"

# ✅ CORRECT - no trailing slash
app.redirect_uris = "http://localhost:4200/callback"
```

**Solution 2:** Check protocol (http vs https)
```python
# Make sure protocol matches exactly
# If demo is at http://localhost:4200, redirect must be http:// not https://
```

**Solution 3:** Check port
```python
# Port must match
# http://localhost:4200/callback ≠ http://localhost:3000/callback
```

### Issue: Backend returns "invalid_client"

**Check client ID:**
```python
app = Application.objects.get(client_id='BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME')
print(f"Client ID: {app.client_id}")
```

Make sure it matches the `OAUTH_CLIENT_ID` in your environment.ts

### Issue: "Authorization code has expired"

**Solution:** The code is only valid for ~60 seconds. If you see this:
1. The redirect took too long
2. You're trying to reuse an old code

Just start the flow again.

## Backend Script (Copy-Paste)

Save as `setup_oauth_redirect_uris.py`:

```python
from oauth2_provider.models import Application

# Your client ID
CLIENT_ID = 'BCZ0upsNuX9nZu0HxxYdpP6Fq1ZQGbICCuLzgDME'

try:
    app = Application.objects.get(client_id=CLIENT_ID)
    
    # Set redirect URIs for all environments
    app.redirect_uris = """http://localhost:4200/callback
https://capitalcopilot.io/callback
http://127.0.0.1:4200/callback"""
    
    app.save()
    
    print("✅ Successfully updated OAuth2 redirect URIs")
    print("\nRegistered URIs:")
    for uri in app.redirect_uris.split():
        print(f"  ✓ {uri}")
        
except Application.DoesNotExist:
    print(f"❌ No OAuth2 application found with client_id: {CLIENT_ID}")
    print("\nCreate one first:")
    print("  python manage.py create_oauth_application")
```

Run it:
```bash
cd capital-copilot-be
python manage.py shell < setup_oauth_redirect_uris.py
```

## Summary

✅ **Fixed:**
1. demo.html now auto-detects localhost and uses `http://localhost:4200/callback`
2. Created callback.html to handle OAuth redirects
3. Configuration preserved through sessionStorage during OAuth flow

✅ **Required on Backend:**
1. Add `http://localhost:4200/callback` to OAuth application's redirect_uris
2. Keep `https://capitalcopilot.io/callback` for production
3. Optionally add `http://127.0.0.1:4200/callback` as alternative

✅ **Flow:**
```
demo.html → backend authorize → callback.html → demo.html (with token) ✅
```

**After updating the backend redirect URIs, the OAuth flow should work!** 🎉

