"""Database triggers defined once and installed from two places.

Production installs them through Alembic migration 0012; the test suite builds its schema with
``Base.metadata.create_all`` (see tests/conftest.py) rather than by running migrations, so it has to
install the very same trigger here. Keeping the SQL in one module stops the two from drifting apart.
"""

# Keeps palettes.favorites_count in step with the favorites table. GREATEST(..., 0) prevents a
# negative count; the favorites unique constraint means a duplicate save never inserts a second row,
# so a double-save can never double-count; the UPDATE's row lock serialises concurrent changes to
# the same palette. Fires for application writes and for the ON DELETE CASCADE that removes a user's
# or a palette's favorites, so account and palette deletion adjust the counter too.
_FUNCTION = """
CREATE OR REPLACE FUNCTION palette_favorites_count_sync() RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE palettes SET favorites_count = favorites_count + 1
        WHERE id = NEW.palette_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE palettes SET favorites_count = GREATEST(favorites_count - 1, 0)
        WHERE id = OLD.palette_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
"""

_TRIGGER_DROP = "DROP TRIGGER IF EXISTS favorites_count_sync ON favorites;"

_TRIGGER_CREATE = """
CREATE TRIGGER favorites_count_sync
AFTER INSERT OR DELETE ON favorites
FOR EACH ROW EXECUTE FUNCTION palette_favorites_count_sync();
"""

_FUNCTION_DROP = "DROP FUNCTION IF EXISTS palette_favorites_count_sync();"

# Function first, then the trigger (dropped first so a re-run is idempotent).
INSTALL_STATEMENTS: tuple[str, ...] = (_FUNCTION, _TRIGGER_DROP, _TRIGGER_CREATE)
UNINSTALL_STATEMENTS: tuple[str, ...] = (_TRIGGER_DROP, _FUNCTION_DROP)
