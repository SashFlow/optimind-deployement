# 3DGS avatar assets

Place LAM export zips here (filenames match catalog avatar ids):

| Catalog id           | Zip                         | Preview image                         |
| -------------------- | --------------------------- | ------------------------------------- |
| `avatar`             | `avatar.zip`                | `/images/gsplat/avatar.png`           |
| `avatar-maledoc`     | `avatar-maledoc.zip`        | `/images/gsplat/avatar-maledoc.png`   |
| `avatar-femaledoc`   | `avatar-femaledoc.zip`      | `/images/gsplat/avatar-femaledoc.png` |

```bash
# From the sibling avatar / pipeline repos:
cp ../avatar/public/gsplat/avatar.zip ./avatar.zip
# or
cp ../avatar-pipline/web/public/avatar.zip ./avatar.zip
```

The gsplat session stage loads `/gsplat/{avatarId}.zip` in the browser. Session
routes set COOP/COEP so the splat renderer can use SharedArrayBuffer.
