-- Required by createForm's existing ON CONFLICT ("User") clause.
-- Matches the index already present in the development database.
-- Fails if duplicate forms exist; does not delete or merge any data.
CREATE UNIQUE INDEX IF NOT EXISTS "userId" ON public."Form" ("User");
