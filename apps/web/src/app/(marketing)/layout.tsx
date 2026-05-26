import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingHeader } from '@/components/marketing/header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950" style={{ overflowX: 'clip' }}>
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
