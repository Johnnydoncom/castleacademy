"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { GallerySlide } from "@/lib/gallery";

const pad = (n: number) => String(n).padStart(2, "0");

/** Plays only while its slide is showing, so a gallery of videos isn't all decoding at once. */
function SlideVideo({ src, active }: { src: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      className="h-full w-full object-cover"
      muted
      loop
      playsInline
      preload={active ? "auto" : "metadata"}
    />
  );
}

export function Gallery({ items }: { items: GallerySlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Every item hidden from the dashboard — drop the section rather than show an empty frame.
  if (items.length === 0) return null;
  const multiple = items.length > 1;

  return (
    <section id="gallery" className="bg-royal py-20 text-white md:py-28" aria-labelledby="gallery-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
              Inside Castle Academy
            </p>
            <h2 id="gallery-heading" className="mt-3 max-w-xl font-display text-3xl leading-tight md:text-5xl">
              A room that <span className="text-gold">feels</span> as premium as it looks.
            </h2>
          </div>
          <div className={cn("hidden gap-2", multiple && "md:flex")}>
            <button
              onClick={() => api?.scrollPrev()}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-gold hover:text-gold"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => api?.scrollNext()}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-gold hover:text-gold"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <Carousel setApi={setApi} opts={{ loop: multiple }} className="mt-12">
          <CarouselContent className="-ml-4">
            {items.map((g, i) => (
              <CarouselItem key={g.id} className="pl-4 md:basis-4/5 lg:basis-2/3">
                <figure className="overflow-hidden rounded-2xl border border-gold/30 bg-royal-deep">
                  <div className="relative h-[320px] w-full sm:h-[440px] md:h-[520px]">
                    {g.type === "video" ? (
                      <SlideVideo src={g.src} active={i === current} />
                    ) : (
                      <Image
                        src={g.src}
                        alt={g.caption || `Castle Academy training room, photo ${i + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 80vw"
                        className="object-cover"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                    )}
                  </div>
                  <figcaption className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-sm text-white/80">
                    <span>{g.caption}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-gold">
                      {pad(i + 1)} / {pad(items.length)}
                    </span>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {multiple && (
          <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Gallery slides">
            {items.map((g, i) => (
              <button
                key={g.id}
                role="tab"
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current ? "w-8 bg-gold" : "w-4 bg-white/25 hover:bg-white/50"
                )}
                aria-label={g.caption ? `Slide ${i + 1}: ${g.caption}` : `Slide ${i + 1}`}
                aria-selected={i === current}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
