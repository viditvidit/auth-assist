'use client';

import { Badge } from '@/components/ui/badge';
import type { CarouselApi } from '@/components/ui/carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, ArrowRightIcon, GlobeIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type InlineCitationProps = ComponentProps<'span'>;

export const InlineCitation = ({ className, ...props }: InlineCitationProps) => (
  <span className={cn('group inline items-center gap-1', className)} {...props} />
);

export type InlineCitationTextProps = ComponentProps<'span'>;

export const InlineCitationText = ({ className, ...props }: InlineCitationTextProps) => (
  <span className={cn('transition-colors group-hover:bg-accent', className)} {...props} />
);

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>;

export const InlineCitationCard = (props: InlineCitationCardProps) => <HoverCard {...props} />;

export function CitationFavicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />;
  return (
    <img
      src={new URL('/favicon.ico', url).href}
      width={14}
      height={14}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-3.5 shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
  label?: string;
};

export const InlineCitationCardTrigger = ({ sources, label, className, ...props }: InlineCitationCardTriggerProps) => (
  <HoverCardTrigger
    href={sources[0]}
    target="_blank"
    rel="noopener noreferrer"
    title={label}
    render={
      <Badge
        render={<a />}
        className={cn('citation-pill mx-0.5 h-6 max-w-60 gap-1.5 rounded-md align-middle', className)}
        variant="outline"
        {...props}
      />
    }
  >
    {sources[0] && <CitationFavicon key={sources[0]} url={sources[0]} />}
    <span className="truncate">{label ?? (sources[0] ? new URL(sources[0]).hostname : 'Reference unavailable')}</span>
  </HoverCardTrigger>
);

export type InlineCitationCardBodyProps = ComponentProps<'div'>;

export const InlineCitationCardBody = ({ className, ...props }: InlineCitationCardBodyProps) => (
  <HoverCardContent className={cn('relative w-80 p-0', className)} {...props} />
);

const CarouselApiContext = createContext<CarouselApi | undefined>(undefined);

const useCarouselApi = () => {
  const context = useContext(CarouselApiContext);
  return context;
};

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>;

export const InlineCitationCarousel = ({ className, children, ...props }: InlineCitationCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <CarouselApiContext.Provider value={api}>
      <Carousel className={cn('w-full', className)} setApi={setApi} {...props}>
        {children}
      </Carousel>
    </CarouselApiContext.Provider>
  );
};

export type InlineCitationCarouselContentProps = ComponentProps<'div'>;

export const InlineCitationCarouselContent = (props: InlineCitationCarouselContentProps) => (
  <CarouselContent {...props} />
);

export type InlineCitationCarouselItemProps = ComponentProps<'div'>;

export const InlineCitationCarouselItem = ({ className, ...props }: InlineCitationCarouselItemProps) => (
  <CarouselItem className={cn('w-full flex flex-col gap-2 p-4 pl-8', className)} {...props} />
);

export type InlineCitationCarouselHeaderProps = ComponentProps<'div'>;

export const InlineCitationCarouselHeader = ({ className, ...props }: InlineCitationCarouselHeaderProps) => (
  <div className={cn('flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2', className)} {...props} />
);

export type InlineCitationCarouselIndexProps = ComponentProps<'div'>;

export const InlineCitationCarouselIndex = ({ children, className, ...props }: InlineCitationCarouselIndexProps) => {
  const api = useCarouselApi();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const syncState = useCallback(() => {
    if (!api) {
      return;
    }
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
  }, [api]);

  useEffect(() => {
    if (!api) {
      return;
    }

    syncState();

    api.on('select', syncState);

    return () => {
      api.off('select', syncState);
    };
  }, [api, syncState]);

  return (
    <div
      className={cn('flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs', className)}
      {...props}
    >
      {children ?? `${current}/${count}`}
    </div>
  );
};

export type InlineCitationCarouselPrevProps = ComponentProps<'button'>;

export const InlineCitationCarouselPrev = ({ className, ...props }: InlineCitationCarouselPrevProps) => {
  const api = useCarouselApi();

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollPrev();
    }
  }, [api]);

  return (
    <button aria-label="Previous" className={cn('shrink-0', className)} onClick={handleClick} type="button" {...props}>
      <ArrowLeftIcon className="size-4 text-muted-foreground" />
    </button>
  );
};

export type InlineCitationCarouselNextProps = ComponentProps<'button'>;

export const InlineCitationCarouselNext = ({ className, ...props }: InlineCitationCarouselNextProps) => {
  const api = useCarouselApi();

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  return (
    <button aria-label="Next" className={cn('shrink-0', className)} onClick={handleClick} type="button" {...props}>
      <ArrowRightIcon className="size-4 text-muted-foreground" />
    </button>
  );
};

export type InlineCitationSourceProps = ComponentProps<'div'> & {
  title?: string;
  url?: string;
  description?: string;
};

export const InlineCitationSource = ({
  title,
  url,
  description,
  className,
  children,
  ...props
}: InlineCitationSourceProps) => (
  <div className={cn('flex flex-col gap-1', className)} {...props}>
    {title && <h4 className="font-medium text-sm leading-tight break-words">{title}</h4>}
    {url && <p className="truncate break-all text-muted-foreground text-xs">{url}</p>}
    {description && <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">{description}</p>}
    {children}
  </div>
);

export type InlineCitationQuoteProps = ComponentProps<'blockquote'>;

export const InlineCitationQuote = ({ children, className, ...props }: InlineCitationQuoteProps) => (
  <blockquote className={cn('border-muted border-l-2 pl-3 text-muted-foreground text-sm italic', className)} {...props}>
    {children}
  </blockquote>
);
