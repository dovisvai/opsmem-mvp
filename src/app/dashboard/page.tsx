import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import DashboardClient from './client-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — OpsMem',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || !session.workspaceId) {
    redirect('/');
  }

  return <DashboardClient workspaceId={session.workspaceId} role={session.role} slackUserId={session.slackUserId} />;
}
