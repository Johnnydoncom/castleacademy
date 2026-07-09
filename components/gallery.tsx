"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const GALLERY = [
  { type: "video", src: "/images/castle-academy-training-space-tour.mp4", caption: "Full space tour" },
  { type: "image", src: "/images/training-room-classroom-setup.jpeg", caption: "Classroom setup — 24 seats" },
  { type: "image", src: "/images/training-room-smart-tv-presentation.jpeg", caption: "Smart TV & presentation wall" },
  { type: "image", src: "/images/training-room-front-perspective.jpeg", caption: "Bright, focused learning environment" },
  { type: "image", src: "/images/training-room-full-view-back.jpeg", caption: "Space for strategy sessions" },
  { type: "image", src: "/images/training-room-interactive-display.jpeg", caption: "Interactive display and premium AV" },
];

export function Gallery() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

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
          <div className="hidden gap-2 md:flex">
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

        <Carousel setApi={setApi} opts={{ loop: true }} className="mt-12">
          <CarouselContent className="-ml-4">
            {GALLERY.map((g, i) => (
              <CarouselItem key={i} className="pl-4 md:basis-4/5 lg:basis-2/3">
                <figure className="overflow-hidden rounded-2xl border border-gold/30 bg-royal-deep">
                  <div className="relative h-[320px] w-full sm:h-[440px] md:h-[520px]">
                    {g.type === "video" ? (
                      <video
                        src={g.src}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <Image
                        src={g.src}
                        alt={g.caption}
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
                      0{i + 1} / 0{GALLERY.length}
                    </span>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Gallery slides">
          {GALLERY.map((g, i) => (
            <button
              key={i}
              role="tab"
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current ? "w-8 bg-gold" : "w-4 bg-white/25 hover:bg-white/50"
              )}
              aria-label={`Slide ${i + 1}: ${g.caption}`}
              aria-selected={i === current}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
