import { Logo } from "@/components/logo";
import { sql } from "@/lib/db";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Link as LinkIcon } from "lucide-react";

const NAV_LINKS = [
  { href: "#why", label: "Why Castle" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how", label: "How it works" },
  { href: "#gallery", label: "Gallery" },
  { href: "#faq", label: "FAQ" },
  { href: "#book", label: "Book" },
];

export async function Footer() {
  let socialLinks: Record<string, string> = {};
  try {
    const rows = await sql`SELECT platform, url FROM social_links WHERE url IS NOT NULL AND url != ''`;
    for (const row of rows) {
      socialLinks[row.platform as string] = row.url as string;
    }
  } catch (err) {
    console.error("Failed to fetch social links for footer:", err);
  }

  const getIcon = (platform: string) => {
    switch (platform) {
      case "facebook": return <Facebook className="w-5 h-5" />;
      case "instagram": return <Instagram className="w-5 h-5" />;
      case "twitter": return <Twitter className="w-5 h-5" />;
      case "youtube": return <Youtube className="w-5 h-5" />;
      case "linkedin": return <Linkedin className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
    }
  };

  return (
    <footer className="bg-royal-deep pt-14 pb-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <Logo tone="onDark" className="h-14" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            A modern, fully equipped training venue in Adeniyi Jones, Ikeja, Lagos — built for
            HR teams, trainers and organisations that expect the best.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Explore
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-gold transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
            Contact
          </div>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li>
              <a href="tel:+2349042222296" className="hover:text-gold transition-colors">
                +234 904 222 2296
              </a>
            </li>
            <li>
              <a href="mailto:bookings@castleacademy.ng" className="hover:text-gold transition-colors">
                bookings@castleacademy.ng
              </a>
            </li>
            <li>Adeniyi Jones, Ikeja, Lagos</li>
          </ul>

          {Object.keys(socialLinks).length > 0 && (
            <div className="mt-8 flex items-center gap-4">
              {Object.entries(socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-gold transition-colors"
                  aria-label={platform}
                >
                  {getIcon(platform)}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 px-5 pt-6 text-xs text-white/50 md:flex-row md:px-8">
        <div>© {new Date().getFullYear()} The Castle Academy. All rights reserved.</div>
        <div>Made with care in Lagos, Nigeria.</div>
      </div>
    </footer>
  );
}
