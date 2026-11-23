BEGIN;
ALTER TABLE event_program ADD COLUMN end_time text CHECK(end_time IS NULL OR (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND end_time>time));
ALTER TABLE event_settings ALTER COLUMN starts_at SET DEFAULT '2026-11-26 16:00:00+05';
UPDATE event_settings SET starts_at='2026-11-26 16:00:00+05' WHERE id=1;
UPDATE event_settings SET description='Ерекше кеш. Мыңдаған ұмытылмас естелік.' WHERE description='One extraordinary evening. A thousand unforgettable memories.';
UPDATE event_settings SET location='Мектептің акт залы' WHERE location='School Grand Hall';
DELETE FROM event_program;
INSERT INTO event_program(time,end_time,title,description,sort_order) VALUES
('16:00','17:00','Вальс','Әсем әуен мен жұптардың вальсіне арналған салтанатты сағат.',0),
('17:00','18:30','Дискотека және ойын-сауық бағдарламасы','Би алаңы, көңілді ойындар және кештің ерекше сәттері.',1);
INSERT INTO audit_log(action,details) VALUES('program_schedule_updated','{"starts_at":"2026-11-26T16:00:00+05:00","source":"003_program_schedule"}');
INSERT INTO schema_migrations(version) VALUES('003_program_schedule');
COMMIT;
