-- Hub collection counts change with every collection write; they are derived,
-- not hub edits, so they must not move the hub's updated_at.
CREATE FUNCTION public.set_hub_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (to_jsonb(NEW) - 'collection_count' - 'published_collection_count' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'collection_count' - 'published_collection_count' - 'updated_at') THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER trg_set_updated_at_hubs ON public.hubs;
CREATE TRIGGER trg_set_updated_at_hubs BEFORE UPDATE ON public.hubs
  FOR EACH ROW EXECUTE FUNCTION public.set_hub_updated_at();
