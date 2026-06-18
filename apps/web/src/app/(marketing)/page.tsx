import { Hero } from '@/components/marketing/sections/hero';
import { Problem } from '@/components/marketing/sections/problem';
import { HowItWorks } from '@/components/marketing/sections/how-it-works';
import { Capabilities } from '@/components/marketing/sections/capabilities';
import { Segments } from '@/components/marketing/sections/segments';
import { ForgeDemo } from '@/components/marketing/forge-demo';
import { ProductProof } from '@/components/marketing/sections/product-proof';
import { PricingTeaser } from '@/components/marketing/sections/pricing-teaser';
import { MarketingFaq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/sections/final-cta';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Capabilities />
      <Segments />
      <div id="forge" className="scroll-mt-20">
        <ForgeDemo />
      </div>
      <ProductProof />
      <PricingTeaser />
      <MarketingFaq />
      <FinalCta />
    </>
  );
}
