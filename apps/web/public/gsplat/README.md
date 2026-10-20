# 3DGS avatar asset

Place the LAM export zip here as `avatar.zip` (gitignored).

```bash
# From the sibling avatar / pipeline repos:
cp ../avatar/public/gsplat/avatar.zip ./avatar.zip
# or
cp ../avatar-pipline/web/public/avatar.zip ./avatar.zip
```

The gsplat session stage loads `/gsplat/avatar.zip` in the browser. Session
routes set COOP/COEP so the splat renderer can use SharedArrayBuffer.
