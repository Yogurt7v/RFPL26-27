-- Авто-генерация id для matches
-- Парсер вставляет без id, конфликт по (round, home_team, away_team)

CREATE SEQUENCE IF NOT EXISTS matches_id_seq OWNED BY matches.id;
SELECT setval('matches_id_seq', COALESCE((SELECT MAX(id) FROM matches), 1));
ALTER TABLE matches ALTER COLUMN id SET DEFAULT nextval('matches_id_seq');
