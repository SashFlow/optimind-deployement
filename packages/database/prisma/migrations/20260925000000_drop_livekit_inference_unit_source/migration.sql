-- Drop LIVEKIT_INFERENCE from UnitSource: all models now run against provider APIs (BYOK).
-- Postgres cannot remove an enum label in place, so rebuild the type.

-- 1. Re-point existing rows at BYOK before the label disappears.
ALTER TABLE "public"."session_usage" ALTER COLUMN "unitSource" DROP DEFAULT;

UPDATE "public"."session_usage"
SET "unitSource" = 'BYOK'
WHERE "unitSource" = 'LIVEKIT_INFERENCE';

UPDATE "public"."provider_rate"
SET "unitSource" = 'BYOK'
WHERE "unitSource" = 'LIVEKIT_INFERENCE';

-- 2. Swap in the narrowed enum.
CREATE TYPE "public"."UnitSource_new" AS ENUM ('BYOK', 'PLATFORM');

ALTER TABLE "public"."session_usage"
    ALTER COLUMN "unitSource" TYPE "public"."UnitSource_new"
    USING ("unitSource"::text::"public"."UnitSource_new");

ALTER TABLE "public"."provider_rate"
    ALTER COLUMN "unitSource" TYPE "public"."UnitSource_new"
    USING ("unitSource"::text::"public"."UnitSource_new");

DROP TYPE "public"."UnitSource";

ALTER TYPE "public"."UnitSource_new" RENAME TO "UnitSource";

-- 3. Restore the default, now BYOK.
ALTER TABLE "public"."session_usage"
    ALTER COLUMN "unitSource" SET DEFAULT 'BYOK';
