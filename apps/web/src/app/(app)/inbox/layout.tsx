import { listConversations, requireWorkspace } from '@/lib/inbox';

import { InboxRealtime } from './inbox-realtime';
import { ConversationListClient } from './conversation-list';

export const metadata = { title: 'Inbox' };
export const dynamic = 'force-dynamic';

interface Props {
  children: React.ReactNode;
}

export default async function InboxLayout({ children }: Props) {
  const { workspace } = await requireWorkspace();
  const conversations = await listConversations(workspace.id, 'all', '');

  return (
    <div className="grid h-[calc(100vh-3.75rem)] grid-cols-1 md:h-screen md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
      <ConversationListClient initialConversations={conversations} />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <InboxRealtime workspaceId={workspace.id} />
    </div>
  );
}
