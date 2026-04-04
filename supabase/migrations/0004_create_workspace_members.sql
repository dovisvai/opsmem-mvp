-- Workspace members table for team collaboration
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  user_email text,
  user_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by text,           -- Slack user_id or email of inviter
  invite_token uuid UNIQUE DEFAULT gen_random_uuid(),
  accepted_at timestamptz,   -- NULL = pending invite
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_members_workspace_id_idx ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_invite_token_idx ON workspace_members(invite_token);
CREATE INDEX IF NOT EXISTS workspace_members_email_idx ON workspace_members(user_email);

-- Enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by our admin client)
CREATE POLICY "Service role full access" ON workspace_members
  FOR ALL USING (true) WITH CHECK (true);
