-- Add slack_user_id to workspace_members to track Slack identity for commands
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS slack_user_id text;

-- Since slack_user_id might not be unique globally (a user could be in multiple workspaces),
-- it must be unique PER WORKSPACE.
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_slack_user_id_workspace_id_idx ON workspace_members (slack_user_id, workspace_id);
