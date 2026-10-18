CREATE TABLE "uploads" (
	"storage_key" text PRIMARY KEY NOT NULL,
	"folder" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "uploads_folder_idx" ON "uploads" USING btree ("folder");