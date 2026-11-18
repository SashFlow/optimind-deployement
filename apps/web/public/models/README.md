# Accessory detector model

Place your customer-supplied **TFLite ObjectDetector** for headphones / earbuds /
earphones at:

```
apps/web/public/models/accessory-detector.tflite
```

It is loaded at runtime from `/models/accessory-detector.tflite` during face capture
(see `faceCapture.accessoryModelUrl` in `apps/web/lib/proctoring/config.ts`).

Expected category labels (lowercase): `headphones`, `earbuds`, `earphones`,
`headset`, `earphone`, `earbud`.

If the file is missing, face capture continues without the earphone gate (soft-fail).
