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
    answer: "Yes, subject to cancellation policy.",
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
    id: "prohibited-activities",
    category: "rules",
    iconName: "ShieldAlert",
    question: "Are there any prohibited activities?",
    answer: "Yes, no smoking or harmful items allowed.",
  },
];
