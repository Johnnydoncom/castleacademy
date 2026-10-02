import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Why } from "@/components/why";
import { PerfectFor } from "@/components/perfect-for";
import { Pricing } from "@/components/pricing";
import { PoliciesAndIncentives } from "@/components/policies-incentives";
import { How } from "@/components/how";
import { Gallery } from "@/components/gallery";
import { BookingBanner } from "@/components/booking-banner";
import { Testimonials } from "@/components/testimonials";
import { Faq } from "@/components/faq";
import { buildFaqItems } from "@/lib/faq-data";
import { loadPricingConfig } from "@/lib/pricing-config-store";
import { loadPublishedGallery } from "@/lib/gallery-store";
import { Location } from "@/components/location";
import { Assistance } from "@/components/assistance";
import { FinalCTA } from "@/components/final-cta";
import { Footer } from "@/components/footer";

/**
 * Prices and incentives on this page are read from `pricing_config`, and the
 * gallery from `gallery_items`, so it must not be frozen at build time — an
 * admin change would never appear. Saving in /admin/pricing or /admin/gallery
 * revalidates this path immediately; the window below is only a safety net in
 * case that ever fails.
 */
export const revalidate = 300;


export default async function Page() {
  const [{ config }, gallery] = await Promise.all([loadPricingConfig(), loadPublishedGallery()]);
  // Built once and shared, so the accordion and the FAQPage structured data
  // always advertise the same terms.
  const faqItems = buildFaqItems(config);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Castle Academy",
      alternateName: "The Castle Academy",
      description:
        "A modern, fully equipped training venue in Lekki, Lagos. Professional classroom space that seats 24, with smart TV, high-speed fibre Wi-Fi, uninterrupted power, quality sound system and full air-conditioning.",
      url: "https://castleacademy.ng",
      telephone: "+234-904-222-2296",
      email: "bookings@castleacademy.ng",
      image: [
        "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f1db1d4-e9e5-4952-b47e-92aa1ce2a4cc/id-preview-107d77e7--16880686-f885-4891-a281-8418e17cabd2.lovable.app-1783026353081.png",
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "29b Olorunnimbe Street, Wemabod Estate",
        addressLocality: "Adeniyi Jones, Ikeja",
        addressRegion: "Lagos State",
        addressCountry: "NG",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 6.6018,
        longitude: 3.3515,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "09:00",
          closes: "18:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday"],
          opens: "09:00",
          closes: "16:00",
        },
      ],
      priceRange: "₦₦",
      currenciesAccepted: "NGN",
      paymentAccepted: "Nomba",
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Smart TV (4K)", value: true },
        { "@type": "LocationFeatureSpecification", name: "High-Speed Wi-Fi", value: true },
        { "@type": "LocationFeatureSpecification", name: "Air Conditioning", value: true },
        { "@type": "LocationFeatureSpecification", name: "Wireless Microphone", value: true },
        { "@type": "LocationFeatureSpecification", name: "Uninterrupted Power Supply", value: true },
        { "@type": "LocationFeatureSpecification", name: "Parking", value: true },
      ],
      numberOfRooms: 1,
      maximumAttendeeCapacity: 24,
      sameAs: ["https://wa.me/2349042222296"],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <Hero />
        <Why />
        <PerfectFor />
        <Pricing />
        <PoliciesAndIncentives />
        <How />
        <Gallery items={gallery} />
        <BookingBanner />
        <Testimonials />
        <Faq items={faqItems} />
        <Location />
        <Assistance />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
