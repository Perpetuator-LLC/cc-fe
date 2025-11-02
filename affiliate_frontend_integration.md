# Affiliate Program - Frontend Integration Guide

## Frontend Implementation Requirements

This document outlines what the frontend needs to implement to support the affiliate program.

## 1. Affiliate Landing Page (`/a/{CODE}`)

When a user visits `/a/ABC12345`, the frontend should:

### API Call
```
GET /a/ABC12345/
```

### Response
```json
{
  "affiliate_code": "ABC12345",
  "affiliate_username": "johndoe",
  "brand_image_url": "/media/affiliates/user-uuid/brand_image.png"
}
```

### UI Components

Display:
1. Affiliate's brand image (if available)
2. Message: "Join [username]'s network"
3. Three action buttons depending on user state:

#### For Non-Authenticated Users
- **"Sign Up"** button → Navigate to registration with affiliate code in URL/state
- **"Sign In"** button → Navigate to login with affiliate code in URL/state

#### For Authenticated Users Without Affiliate
- **"Join Network"** button → Call `joinAffiliateProgram` mutation

#### For Authenticated Users With Affiliate Already
- Show message: "You're already part of [their_affiliate]'s network"

### Store Affiliate Code
- Store the affiliate code in localStorage/sessionStorage
- Pass it during registration or after successful login
- Call `joinAffiliateProgram` mutation once authenticated

## 2. Registration Flow

### Modified Registration Form

After user registers, if affiliate code exists in session:

```graphql
mutation JoinAffiliate {
  joinAffiliateProgram(affiliateCode: "ABC12345") {
    success
    message
    relationship {
      affiliateUsername
      tier
    }
  }
}
```

Show success message: "You've joined [username]'s affiliate network!"

## 3. Affiliate Dashboard (For Affiliates)

### Accept Terms

Before showing affiliate features, check if user has accepted terms:

```graphql
query CheckAffiliateTerms {
  myAffiliateTermsConsents {
    version
    accepted
    date
  }
}
```

If not accepted, show terms modal:

```graphql
mutation AcceptTerms {
  acceptAffiliateTerms(version: "1.0") {
    success
    message
    consent {
      version
      accepted
    }
    affiliateProfile {
      code
      isActive
    }
  }
}
```

### Display Affiliate Code

```graphql
query MyProfile {
  affiliateProfile {
    code
    brandImage
    isActive
    createdAt
  }
}
```

Show:
- Your affiliate link: `https://yoursite.com/a/[CODE]`
- Copy button
- Share buttons (Twitter, LinkedIn, Email)

### Upload Brand Image

```graphql
mutation UploadBrandImage {
  updateAffiliateBrandImage(image: "[base64_or_url]") {
    success
    message
    affiliateProfile {
      brandImage
    }
  }
}
```

### Statistics Dashboard

```graphql
query AffiliateStats {
  myAffiliateStats {
    totalAffiliateCredits
    totalReferrals
    tier1Referrals
    tier2Referrals
  }
}
```

Display:
- Total Earnings: `[totalAffiliateCredits]` credits
- Total Referrals: `[totalReferrals]`
  - Direct (Tier 1): `[tier1Referrals]` - 10% commission
  - Second Level (Tier 2): `[tier2Referrals]` - 5% commission

### Earnings History

```graphql
query MyEarnings {
  myAffiliateCredits {
    amount
    tier
    sourceUsername
    description
    createdAt
  }
}
```

Show table:
| Date | From | Type | Amount |
|------|------|------|--------|
| 2025-11-01 | john | Tier 1 (10%) | 100 credits |

### Available Balance

Calculate from stats or query:
```graphql
query Balance {
  myAffiliateStats {
    totalAffiliateCredits
  }
  myAffiliateConversions {
    affiliateCreditAmount
    status
  }
}
```

Available = Total - Sum(completed conversions)

### Convert to Credits

```graphql
mutation ConvertToCredits {
  convertAffiliateCredits(
    conversionType: "to_credits"
    amount: 500
  ) {
    success
    message
    conversion {
      conversionType
      affiliateCreditAmount
      targetAmount
      status
    }
  }
}
```

Show success message: "500 affiliate credits converted to 500 regular credits!"

### Request Cash Payout

```graphql
mutation RequestCashout {
  convertAffiliateCredits(
    conversionType: "to_cash"
    amount: 1000
  ) {
    success
    message
    conversion {
      conversionType
      status
    }
  }
}
```

Show message: "Payout request submitted. You'll receive an email when processed."

### Conversion History

```graphql
query ConversionHistory {
  myAffiliateConversions {
    conversionType
    affiliateCreditAmount
    targetAmount
    status
    createdAt
    completedAt
  }
}
```

Show table:
| Date | Type | Amount | Status |
|------|------|--------|--------|
| 2025-11-01 | Credits | 500 | Completed |
| 2025-10-25 | Cash | 1000 | Pending |

## 4. User Profile Section

### Show Referral Info (For Referred Users)

```graphql
query MyReferral {
  myAffiliateRelationship {
    affiliateUsername
    tier
    createdAt
  }
}
```

Display in user profile:
"You were referred by [affiliateUsername] on [date]"

## 5. Navigation/Menu Items

For users with affiliate profiles, add menu items:
- "Affiliate Dashboard" → `/dashboard/affiliate`
- "My Affiliate Link" → Copy link modal
- "Affiliate Earnings" → Earnings page

## 6. URL Parameters

Handle affiliate code in URLs:
- `/register?ref=ABC12345`
- `/login?ref=ABC12345`
- `/a/ABC12345` (dedicated landing page)

Store in session and apply after auth.

## 7. Notifications

Show notifications when:
- New referral joins (if implementing real-time)
- Affiliate credits earned
- Conversion completes
- Payout processes

## Example React Components Structure

```
components/
  affiliate/
    AffiliateLanding.tsx       # /a/{code} page
    AffiliateDashboard.tsx     # Main dashboard
    AffiliateStats.tsx         # Statistics widget
    AffiliateEarnings.tsx      # Earnings list
    AffiliateConversions.tsx   # Conversion history
    BrandImageUpload.tsx       # Image upload
    ShareModal.tsx             # Share link modal
    ConvertCreditsModal.tsx    # Conversion modal
    AffiliateTermsModal.tsx    # Terms acceptance
```

## Error Handling

Handle these error cases:
1. Invalid affiliate code → Show error message
2. User already has affiliate → Show informative message
3. Self-referral attempt → "You cannot use your own code"
4. Insufficient balance for conversion → Show available balance
5. Network errors → Retry options

## Testing Checklist

- [ ] Non-auth user visits affiliate link → See landing page
- [ ] User registers with affiliate code → Relationship created
- [ ] Existing user accepts affiliate code → Relationship created
- [ ] User with affiliate tries another code → Rejected
- [ ] Affiliate accepts terms → Profile created with code
- [ ] Affiliate uploads brand image → Image displayed
- [ ] Referral makes purchase → Affiliate sees credits
- [ ] Affiliate converts to credits → Balance updates
- [ ] Affiliate requests cashout → Status shows pending
- [ ] Stats update correctly with each action

