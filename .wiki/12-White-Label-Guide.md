# 12 - White-Label Guide

## White-Label Goals

Enable any family to deploy this stack with minimal code changes.

## Configuration Dimensions

- branding (name, logos, palette)
- domain and subdomain mapping
- role defaults and policy templates
- feature toggles by family preference
- localization and timezone defaults

## Tenant Bootstrap Inputs

- family display name
- primary admin account details
- desired domain/subdomain map
- preferred policy mode (standard or culturally constrained)
- storage and retention profile

## White-Label Safety Principles

- no hardcoded family identifiers
- no hardcoded domains
- no environment-specific assumptions in app logic
- all sensitive defaults must be explicit and reviewable

## Backend-URL Configuration Model

Every nTV client (web, mobile, desktop, TV, nTV OS) supports dynamic backend discovery:

- **Default app**: user enters `tv.mydomain.com` or IP on first launch
- **White-labeled build**: backend URL compiled in, user sees branded experience immediately
- Public config endpoint: `GET /api/v1/config` returns branding, theme, feature flags
- Config cached locally for instant startup; refreshed in background
- Feature toggles control which content verticals are visible per tenant (VOD, Live TV, Sports, Podcasts, Games)

See wiki 47 (Backend-URL Dynamic Configuration) for full endpoint spec.

## Platform-Specific White-Label Packaging

| Platform | White-Label Method |
| --- | --- |
| Web | deploy to custom domain, config fetched at runtime |
| Mobile (iOS/Android) | custom bundle ID + compiled-in backend URL + custom App Store listing |
| Desktop (Mac/Win/Linux) | custom installer with compiled-in backend URL and branding assets |
| Android TV | custom APK with compiled-in URL, sideload or custom Play Store listing |
| nTV OS | custom OS image with baked-in backend URL, boot splash, and branding |

## nTV OS White-Label Provisioning

Three methods for configuring nTV OS devices:

1. **USB provisioning key**: JSON config file on USB drive auto-applies at first boot
2. **Headless provisioning**: SSH/serial configuration for fleet deployment
3. **Remote push**: backend admin panel pushes config to registered devices

See wiki 45 (nTV OS Spec) for full provisioning details.

## Packaging Recommendation

Define a repeatable setup bundle:

- environment variable templates
- bootstrap SQL and seeds
- deployment templates (VPS + web)
- post-deploy validation checklist
- nTV OS image build config (backend URL, branding assets)
- mobile/TV APK build config (bundle ID, backend URL)
