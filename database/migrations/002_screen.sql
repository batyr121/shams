BEGIN;
ALTER TABLE event_settings ADD COLUMN screen_results_visible boolean NOT NULL DEFAULT false;
ALTER TABLE voting_sessions ALTER COLUMN label SET DEFAULT 'Шәмші Қайырымдылық Балы 2026';
UPDATE voting_sessions SET label='Шәмші Қайырымдылық Балы 2026' WHERE label='The Grand Ball 2026';
INSERT INTO schema_migrations(version) VALUES('002_screen');
COMMIT;
