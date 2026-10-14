-- Cobalt redesign M2: link notes, section-tied comments, remembered visibility
-- and trigger-maintained hub collection counts (ADR-0069).

-- AlterTable
ALTER TABLE "collection_comments" ADD COLUMN     "item_id" UUID,
ADD COLUMN     "section_id" UUID;

-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "collection_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "published_collection_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "note" VARCHAR(280);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "new_collection_published" BOOLEAN;

-- AddForeignKey
ALTER TABLE "collection_comments" ADD CONSTRAINT "collection_comments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collection_comments" ADD CONSTRAINT "collection_comments_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- SQL-only rules (not expressible in the Prisma schema; never drop in a diff).
-- Notes belong to links, never to section headings, and are never blank.
ALTER TABLE "resources" ADD CONSTRAINT resources_note_check
  CHECK (note IS NULL OR (kind <> 'heading' AND length(btrim(note)) > 0));
-- Replies inherit their parent's section and item, so they store neither.
ALTER TABLE "collection_comments" ADD CONSTRAINT collection_comments_scope_check
  CHECK (parent_id IS NULL OR (section_id IS NULL AND item_id IS NULL));
ALTER TABLE "hubs" ADD CONSTRAINT hubs_collection_counts_check
  CHECK (collection_count >= 0 AND published_collection_count >= 0
         AND published_collection_count <= collection_count);

CREATE INDEX idx_collection_comments_section
  ON public.collection_comments (section_id) WHERE section_id IS NOT NULL;

-- Keep hub counts in step with every collection write, whatever path makes it.
CREATE FUNCTION public.hub_collection_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE public.hubs
       SET collection_count = collection_count - 1,
           published_collection_count = published_collection_count - (CASE WHEN OLD.published THEN 1 ELSE 0 END)
     WHERE id = OLD.hub_id;
  END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') THEN
    UPDATE public.hubs
       SET collection_count = collection_count + 1,
           published_collection_count = published_collection_count + (CASE WHEN NEW.published THEN 1 ELSE 0 END)
     WHERE id = NEW.hub_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER collections_hub_counts
  AFTER INSERT OR DELETE OR UPDATE OF hub_id, published ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.hub_collection_counts();

-- Backfill existing hubs.
UPDATE public.hubs h
   SET collection_count = c.total, published_collection_count = c.published
  FROM (SELECT hub_id, count(*)::int AS total, count(*) FILTER (WHERE published)::int AS published
          FROM public.collections GROUP BY hub_id) c
 WHERE c.hub_id = h.id;
