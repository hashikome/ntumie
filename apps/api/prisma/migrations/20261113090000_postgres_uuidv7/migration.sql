-- Generated keys default to PostgreSQL 18's built-in uuidv7(). The app_uuid_v7()
-- wrapper from 0_init only delegated to it here, and its fallback to random v4 ids
-- could only hide a database older than 18. Existing ids are unchanged.
ALTER TABLE public."accounts" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."audit_logs" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."collection_comments" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."collections" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."email_outbox" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."feature_interest" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."hub_handle_reservations" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."hubs" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."import_drafts" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."import_folders" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."import_rows" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."link_metadata" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."passkeys" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."resources" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."service_invitations" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."sessions" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."share_entries" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."share_opens" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."tags" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."two_factors" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."users" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE public."verifications" ALTER COLUMN "id" SET DEFAULT uuidv7();

DROP FUNCTION public.app_uuid_v7();
