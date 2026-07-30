-- Password Recovery via Security Question
-- Run in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION get_security_question(login TEXT)
RETURNS TABLE(question TEXT) AS $$
  SELECT security_question FROM users WHERE username = login;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION reset_password_with_security(
  login TEXT, answer TEXT, new_password TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM users
  WHERE username = login
    AND security_answer_hash = encode(digest(lower(answer), 'sha256'), 'hex');

  IF user_id IS NULL THEN RETURN FALSE; END IF;

  UPDATE users SET password_hash = encode(digest(new_password, 'sha256'), 'hex')
  WHERE id = user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_security_question(
  user_id UUID, question TEXT, answer TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users SET
    security_question = question,
    security_answer_hash = encode(digest(lower(answer), 'sha256'), 'hex')
  WHERE id = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
