import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "onLight",
}: {
  className?: string;
  tone?: "onLight" | "onDark";
}) {
  if (tone === "onDark") {
    return (
      <Image
        src="/logo.png"
        alt="The Castle Academy"
        className={cn("h-14 w-auto object-contain", className)}
        width={220}
        height={72}
        priority
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-royal px-3 py-1.5 shadow-sm ring-1 ring-gold/20",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="The Castle Academy"
        className="h-8 w-auto object-contain"
        width={140}
        height={40}
        priority
      />
    </span>
  );
}
