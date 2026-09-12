-- Store intended platform role for organization invitations
ALTER TABLE "invitation"
ADD COLUMN "platformRole" TEXT DEFAULT 'user';
