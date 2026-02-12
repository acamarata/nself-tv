# 40 - Ecosystem Apps and Shared Backend

## Purpose

Define how `nself-tv` can run independently or integrate with the wider nSelf ecosystem.

## Repository Roles

1. `nself-tv` (`/Users/admin/Sites/nself-tv`)
- standalone nTV product: frontend, backend, AntBox, AntServer.

2. `nself-family` (`/Users/admin/Sites/nself-family`)
- family product and ecosystem showcase monorepo.

3. `nself-chat` (`/Users/admin/Sites/nself-chat`)
- standalone nChat product.

## Shared Backend Model

1. nTV can run with a dedicated backend stack.
2. nTV can also align to shared identity/session contracts with family/chat ecosystems.
3. Cross-app compatibility requires strict contract versioning and migration discipline.

## Domain Routing Pattern (Example)

1. `www.myfamily.com` -> nFamily
2. `chat.myfamily.com` -> nChat
3. `tv.myfamily.com` -> nTV

## Integration Expectations

1. shared auth/session behavior must be deterministic
2. tenant and policy boundaries must remain enforced
3. contract-breaking changes require coordinated release planning across repos
4. no repo should silently re-implement another repo's product internals
