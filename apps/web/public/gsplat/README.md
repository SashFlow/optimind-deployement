# OptiModel assets (legacy path)

OptiModel no longer loads LAM `/gsplat/*.zip` packs.

SpatialReal models live under:

| Catalog id | Character UUID                         | Assets                                      |
| ---------- | -------------------------------------- | ------------------------------------------- |
| `samira`   | `a0a234f5-0e04-483c-9cf1-3d5bd88b4442` | `/spatialreal/avatars/samira-a0a234f5/`     |
| `sanjay`   | `3c409ac5-2637-4dd6-9c0c-c47c4b085966` | `/spatialreal/avatars/sanjay-3c409ac5/`     |

```bash
# Sync from the sibling avatar repo:
cp -R ../avatar/public/spatialreal/avatars/samira-a0a234f5 ./spatialreal/avatars/
cp -R ../avatar/public/spatialreal/avatars/sanjay-3c409ac5 ./spatialreal/avatars/
```

Spatius AvatarKit loads them via `/spatialreal-api/v2/avatar/{characterId}`
(host / offline mode). Session routes set COOP/COEP for SharedArrayBuffer.
