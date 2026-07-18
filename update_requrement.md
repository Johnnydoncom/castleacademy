You are a Senior Full-Stack Software Engineer. Enhance the existing booking website by implementing the following features without breaking any existing functionality, UI, database relationships, APIs, or business logic. Follow the existing project architecture, coding standards, and design system.

## Feature 1: Venue Availability
- Add a "Days of Availability" section so customers can easily see when the venue is open.
- Store opening days and hours in the database (do not hardcode).
- Create an admin interface to manage the schedule.
- Highlight today's availability and display "Closed Today" when applicable.
- Ensure the schedule is fully responsive.

## Feature 2: Floating WhatsApp Button
- Convert the existing WhatsApp button into a floating action button.
- Keep it fixed at the bottom-right corner and visible while users scroll.
- Ensure it is responsive, does not overlap important content, and opens the WhatsApp chat correctly.
- Add a subtle hover animation and an optional pulse animation.

## Feature 3: Social Media Links
- Add configurable social media links for Facebook, Instagram, X (Twitter), TikTok, YouTube, and LinkedIn.
- Create an admin section to manage these links.
- Only display platforms that have a configured URL.
- Open all links in a new browser tab and use SVG icons consistent with the existing UI.

## Feature 4: Booking Reference Number
- Automatically generate a unique booking reference whenever a booking is successfully confirmed.
- Store the reference in the database using a unique constraint.
- Display the reference on the booking confirmation page, booking details page, admin dashboard, confirmation email/notification (if applicable), and any printable booking receipt.
- Allow administrators to search, filter, and copy bookings using the booking reference.

## Feature 5: Non-Refundable Booking Notice
- Display the following message wherever a customer confirms a booking:
  "Once a booking is confirmed, it cannot be cancelled or refunded."
- Show this notice on the booking form, booking summary, booking confirmation page, and confirmation modal (if applicable).
- Add a mandatory checkbox requiring users to acknowledge the policy before they can confirm their booking.

## General Requirements
- Preserve all existing features and functionality.
- Do not introduce breaking changes.
- Use reusable, maintainable, and well-documented code.
- Follow SOLID principles and clean architecture.
- Update models, migrations, controllers, services, repositories, APIs, frontend components, and admin pages as required.
- Validate and sanitize all user inputs.
- Ensure accessibility (WCAG-friendly where possible).
- Ensure the UI is fully responsive across desktop, tablet, and mobile devices.
- Optimize for performance and security.
- Add database migrations only where necessary.
- Add unit and feature tests for all new functionality.
- Perform regression testing to ensure the existing booking workflow continues to function correctly.

Before making changes, analyze the existing codebase to understand its architecture and reuse existing components wherever possible instead of creating duplicate functionality.

# Nomba Payment Gateway Integration
Integrate Nomba Payment Gateway, a Nigerian payment gateway. Documentation can be found https://developer.nomba.com/, https://developer.nomba.com/docs/guides/accept-online-payments
- Use the sandbox for testing purpose.
- Use test credentials provided by Nomba for testing.

- Sandbox environment credentials:
    - Client ID: e3b9e5cb-c81b-4cc5-9e33-2fd7194922dc
    - Private Key: jTRDb1hL4owVYofSSoDQBu3UIPsOV4+2oSlqD91Ho6HVLMExEdpVXGDBq/7KucEOoqAf7VMHoDjiIHOYUPDaEA==
    - Account ID: 836a1d98-d6f4-40b4-a6da-6f06e9d0fad2