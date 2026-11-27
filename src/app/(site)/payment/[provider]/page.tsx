import PaymentReturnView from '@/views/PaymentReturnView';

const PROVIDERS = ['esewa', 'khalti', 'fonepay', 'stripe'] as const;

// Static export: one page per gateway that can send the browser back.
export const dynamicParams = false;
export const generateStaticParams = () => PROVIDERS.map((provider) => ({ provider }));

export default async function Page({ params }: { params: Promise<{ provider: (typeof PROVIDERS)[number] }> }) {
  const { provider } = await params;
  return <PaymentReturnView provider={provider} />;
}
