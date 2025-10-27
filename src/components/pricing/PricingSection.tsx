"use client";

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { pricingTiers } from '@/constants/pricing';

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  // Embla API for mobile carousel indicators
  const [carouselApi, setCarouselApi] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const update = () => {
      try {
        setSelectedIndex(carouselApi.selectedScrollSnap());
        setSnapCount(carouselApi.scrollSnapList().length);
      } catch {
        // no-op safeguard
      }
    };
    update();
    carouselApi.on('select', update);
    carouselApi.on('reInit', update);
    return () => {
      try {
        carouselApi.off('select', update);
        carouselApi.off('reInit', update);
      } catch {
        // ignore
      }
    };
  }, [carouselApi]);

  return (
    <section className={cn("px-4 py-8 md:px-6 md:py-16", className)}>
      {/* Desktop: Grid Layout */}
      <div className="hidden md:max-w-5xl md:mx-auto md:grid md:gap-8 md:grid-cols-3">
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
                  <Link href={tier.cta.href ?? '/auth'}>{tier.cta.label}</Link>
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Mobile: Carousel Layout */}
      <div className="md:hidden">
        <Carousel
          setApi={setCarouselApi}
          opts={{
            align: "center",
            dragFree: false,
            slidesToScroll: 1,
            startIndex: 0,
            containScroll: "keepSnaps",
            watchDrag: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {pricingTiers.map((tier) => (
              <CarouselItem key={tier.name}>
                <Card
                  className={cn(
                    'flex h-full flex-col gap-6 border border-border bg-card p-6 shadow-xl transition-colors w-full',
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
                        <Link href={tier.cta.href ?? '/auth'}>{tier.cta.label}</Link>
                      </Button>
                    )}
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* Dots indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: snapCount || pricingTiers.length }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => carouselApi?.scrollTo?.(i)}
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  i === selectedIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </Carousel>
      </div>
    </section>
  );
}
