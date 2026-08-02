export interface FaqItemData {
  id: string;
  category: "booking" | "facility" | "rules";
  iconName:
    | "CalendarClock"
    | "Sparkles"
    | "Clock"
    | "RefreshCw"
    | "CreditCard"
    | "Car"
    | "Paintbrush"
    | "ShieldAlert";
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItemData[] = [
  {
    id: "advance-booking",
    category: "booking",
    iconName: "CalendarClock",
    question: "How far in advance should I make a booking?",
    answer:
      "Not less than 48 hours. We recommend booking early to secure your preferred date and time slot.",
  },
  {
    id: "additional-services",
    category: "rules",
    iconName: "Sparkles",
    question: "Can I request additional services?",
    answer:
      "Yes, we have a list of other services that you can pick from, anything outside of these can be communicated to us for further review.",
  },
  {
    id: "operating-hours",
    category: "facility",
    iconName: "Clock",
    question: "What are your operating hours?",
    answer: "9am to 5pm Mondays to Saturdays.",
  },
  {
    id: "cancel-reschedule",
    category: "booking",
    iconName: "RefreshCw",
    question: "Can I cancel or reschedule my booking?",
    answer:
      "Yes. More than 7 days before your event you can reschedule free of charge (a 5% service charge plus VAT is retained). Between 3 and 7 days, 50% of your payment is retained or applied to a new date. Within 72 hours the booking becomes non-refundable.",
  },
  {
    id: "payment-methods",
    category: "booking",
    iconName: "CreditCard",
    question: "What payment methods do you accept?",
    answer:
      "Online payments. We support secure online transfers and card payments via Paystack and Flutterwave.",
  },
  {
    id: "parking-availability",
    category: "facility",
    iconName: "Car",
    question: "Is parking available?",
    answer: "Yes, we have available parking spaces in the Estate.",
  },
  {
    id: "decorate-branding",
    category: "rules",
    iconName: "Paintbrush",
    question: "Can I decorate or brand the training room?",
    answer: "Yes, however, no nails are allowed on the wall.",
  },
  {
    id: "early-booking-incentive",
    category: "booking",
    iconName: "CalendarClock",
    question: "Do you offer an Early Booking Incentive?",
    answer:
      "Yes! We offer a 5% discount for bookings that are confirmed and paid at least 14 days in advance.",
  },
  {
    id: "referral-rewards",
    category: "booking",
    iconName: "Sparkles",
    question: "How do Referral Rewards work?",
    answer:
      "When you refer an organization or colleague to Castle Academy and they complete a booking, you receive a ₦10,000 credit toward your next booking OR 1 free extra hour.",
  },
  {
    id: "loyalty-discounts",
    category: "booking",
    iconName: "Sparkles",
    question: "Do you have multi-day or loyalty discounts?",
    answer:
      "Yes! Multi-day bookings receive 5% off for 2 consecutive days, and 10% off for 3–5 days. Repeat clients get 10% off their 6th booking after 5 bookings, and 1 complimentary 3-hour session after 10 bookings.",
  },
];
