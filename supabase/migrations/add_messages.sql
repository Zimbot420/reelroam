-- Conversations between two users (sorted usernames guarantee one row per pair)
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_a       TEXT NOT NULL,
  user_b       TEXT NOT NULL,
  UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b);

-- Messages within conversations
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_username TEXT NOT NULL,
  content         TEXT,
  trip_slug       TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_messages_convo ON messages(conversation_id, created_at DESC);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_read"   ON conversations FOR SELECT USING (true);
CREATE POLICY "conv_insert" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "conv_update" ON conversations FOR UPDATE USING (true);
CREATE POLICY "msg_read"    ON messages FOR SELECT USING (true);
CREATE POLICY "msg_insert"  ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "msg_update"  ON messages FOR UPDATE USING (true);
