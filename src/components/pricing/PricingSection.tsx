"use client";

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { pricingTiers } from '@/constants/pricing';

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  return (
    <section className={cn("px-6 py-16", className)}>
      <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                'flex h-full flex-col gap-6 border border-border bg-card p-8 shadow-lg transition-colors',
                tier.featured ? 'border-primary' : 'hover:bg-card/80',
                tier.name === 'Gratis' && 'border-2 border-orange-500'
              )}
            >
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-light text-foreground font-heading">{tier.name}</h2>
                  {tier.badge ? (
                    <Badge variant={tier.featured ? 'default' : 'secondary'}>{tier.badge}</Badge>
                  ) : null}
                </div>
                <div>
                  <div className="mb-2">
                    <div
                      className={cn(
                        "text-3xl font-semibold",
                        /x/i.test(tier.priceLabel)
                          ? "line-through decoration-red-600 decoration-4 decoration-skip-ink-none text-muted-foreground opacity-80"
                          : "text-foreground"
                      )}
                      title={/x/i.test(tier.priceLabel) ? "Harga belum aktif" : undefined}
                      style={/x/i.test(tier.priceLabel)
                        ? { textDecorationColor: 'rgb(220 38 38)', textDecorationThickness: '4px', textDecorationSkipInk: 'none' }
                        : undefined}
                    >
                      {tier.priceLabel}
                    </div>
                    {tier.priceUnit && (
                      <div className="text-sm font-light text-muted-foreground mt-0.5">{tier.priceUnit}</div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tier.tagline}</p>
                </div>
                <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {tier.description.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-5 w-5 text-success-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">
                {tier.cta.disabled ? (
                  <Button
                    className="w-full bg-muted-foreground text-background hover:bg-muted-foreground disabled:opacity-100 disabled:pointer-events-none"
                    disabled
                  >
                    {tier.cta.label}
                  </Button>
                ) : (
                  <Button className="w-full btn-green-solid" asChild>
                    <Link href={tier.cta.href ?? '/auth?tab=register'}>{tier.cta.label}</Link>
                  </Button>
                )}
              </div>
            </Card>
          ))}
      </div>
    </section>
  );
}
