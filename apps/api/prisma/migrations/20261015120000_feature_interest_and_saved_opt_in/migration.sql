-- Public profile opt-in for saved collections (redesign M3b).
ALTER TABLE "users" ADD COLUMN "show_saved_collections" BOOLEAN NOT NULL DEFAULT false;

-- Demand for designed but unbuilt features (fake doors).
CREATE TABLE "feature_interest" (
    "id" UUID NOT NULL DEFAULT app_uuid_v7(),
    "feature" VARCHAR(48) NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_interest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feature_interest_feature_check" CHECK ("feature" ~ '^[a-z][a-z_]{1,47}$')
);

CREATE INDEX "idx_feature_interest_feature_created_at" ON "feature_interest"("feature", "created_at");

ALTER TABLE "feature_interest" ADD CONSTRAINT "feature_interest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
