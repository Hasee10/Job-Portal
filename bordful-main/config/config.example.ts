/**
 * Job Board Configuration Example
 * ----------------------------
 * This is a template for your job board configuration.
 *
 * Quick Start for Users Who Fork This Repository:
 * 1. Copy this file: cp config/config.example.ts config/config.ts
 * 2. Make sure it's called config.ts
 * 3. Customize config.ts with your settings
 * 4. Commit config.ts to your repository
 *
 * IMPORTANT: The main repository does not include config.ts
 * This allows you to maintain your own configuration while
 * still being able to pull updates from the main repository.
 *
 * When updating from upstream (original bordful repo):
 * - Pull the latest changes
 * - Your config.ts will remain unchanged
 * - Check this file for new options
 * - Add desired new options to your config.ts
 */

import type { ScriptProps } from "next/script";
import type { BadgeType } from "@/components/ui/job-badge";
import type { CurrencyCode } from "@/lib/constants/currencies";

// Available font options
export type FontFamily = "geist" | "inter" | "ibm-plex-serif";

// Hero image configuration
type HeroImageConfig = {
  enabled: boolean;
  src?: string;
  alt?: string;
};

// Menu item interface for new flexible menu structure
export type MenuItem = {
  label: string;
  link: string;
  icon?: string;
  dropdown?: boolean;
  items?: MenuItem[];
  external?: boolean;
  // For accessibility
  ariaLabel?: string;
};

// Navigation configuration type
export type NavConfig = {
  title: string;
  logo: {
    enabled: boolean;
    src: string;
    width: number;
    height: number;
    alt: string;
  };
  // Optional white/light-colored logo variant swapped in for dark mode -
  // the default logo.src is typically a dark-stroke SVG that's invisible
  // against a dark background. Falls back to logo.src if unset.
  logoDark?: string;
  github: { show: boolean; url: string };
  linkedin: { show: boolean; url: string };
  twitter: { show: boolean; url: string };
  bluesky: { show: boolean; url: string };
  reddit: { show: boolean; url: string };
  postJob: {
    show: boolean;
    label: string;
    link: string;
    external: boolean;
    variant: "default" | "primary" | "outline" | "secondary" | "ghost" | "link";
  };
  menu: MenuItem[];
};

type CustomScript = {
  src: string;
  strategy: ScriptProps["strategy"];
  attributes?: Record<string, string>;
};

// Plan type for pricing configuration
type PricingPlan = {
  name: string;
  price: number;
  billingTerm: string;
  description: string;
  features: string[];
  cta: {
    label: string;
    link: string;
    variant: string;
  };
  badge: {
    text: string;
    type?: BadgeType;
  } | null;
  highlighted: boolean;
};

// FAQ item type for FAQ configuration
type FAQItem = {
  question: string;
  answer: string;
  // Whether the answer contains markdown/rich text
  isRichText?: boolean;
};

// FAQ category type for FAQ configuration
type FAQCategory = {
  title: string;
  items: FAQItem[];
};

export const config = {
  // About Page Configuration
  about: {
    // Badge text for the about hero
    badge: "About Us",

    // Contact link configuration
    contact: {
      // Contact section description
      description:
        "Have questions or want to learn more about our services? We'd love to hear from you.",
      // Label for the contact link
      label: "Contact Us",
      // Show or hide the contact link
      show: true,
      // Contact section title
      title: "Get in Touch",
      // URL for the contact page or form
      url: "/contact",
      // Button variant (default, outline, secondary, ghost, link)
      variant: "default",
    },
    // Description for the about page
    description:
      "Learn more about our mission to connect talent with opportunity.",
    // Enable or disable the About page
    enabled: true,

    // Hero image configuration (overrides global setting)
    heroImage: {
      alt: "", // Optional custom alt text
      enabled: false, // Disable hero image on the about page
      src: "", // Optional custom image path
    },
    // Label for the about page in navigation
    label: "About Us",
    // Schema.org structured data customization
    schema: {
      // Company name for the schema
      companyName: "Caliber",
      // Description for the schema
      description:
        "Connect talented professionals with meaningful opportunities",
      // Logo URL for the schema
      logo: "/caliber-wordmark.svg",
    },

    // Section titles and content
    sections: {
      mission: {
        content:
          "We're on a mission to connect talented professionals with meaningful opportunities and help organizations find the perfect candidates to drive their success.",
        title: "Mission",
      },
      story: {
        content:
          "Founded with a passion for revolutionizing the job search experience, our platform was built to address the challenges faced by both job seekers and employers in today's competitive market.",
        title: "Story",
      },
      team: {
        content:
          "Our diverse team brings together expertise from recruitment, technology, and design to create an innovative job board solution that puts user experience first.",
        title: "Team",
      },
    },
    // Show or hide the About page in navigation
    showInNavigation: true,
    // Title for the about page hero section
    title: "About Caliber",
  },

  // Marketing & SEO
  badge: "",

  // Contact Page Configuration
  contact: {
    // Badge text for hero section
    badge: "Contact Us",

    // Contact link configuration
    contact: {
      // Label for the contact link
      label: "Contact Us",
      // Show or hide the contact link
      show: true,
      // URL for the contact page or form
      url: "/contact",
      // Button variant (default, outline, secondary, ghost, link)
      variant: "default",
    },

    // Contact information section
    // phone/address left blank on purpose - the ContactInfoSection component
    // hides them when empty, so the page shows email only rather than a fake
    // US phone/address (was placeholder template data). Fill in real values
    // here when you have them.
    contactInfo: {
      address: "",
      companyName: "Caliber",
      description: "Here's how you can reach us directly.",
      email: "hello@caliber.com",
      phone: "",
      title: "Contact Information",
    },
    description: "Have questions or feedback? We'd love to hear from you.",
    // Enable or disable the contact page
    enabled: true,

    // Hero image configuration (overrides global setting)
    heroImage: {
      alt: "", // Optional custom alt text
      enabled: false, // Disable hero image on the contact page
      src: "", // Optional custom image path
    },

    // SEO keywords
    keywords: "contact us, support, help, questions, feedback, get in touch",

    // Navigation label
    navigationLabel: "Contact",

    // Schema.org structured data customization
    schema: {
      description:
        "Get in touch with our team for any questions or support needs.",
    },

    // Show contact link in footer resources
    showInFooter: true,

    // Show contact link in navigation
    showInNavigation: true,

    // Support channels section
    supportChannels: {
      channels: [
        {
          buttonLink: "mailto:hello@caliber.com",
          buttonText: "Contact via Email",
          description:
            "Our support team is available to help you with any questions or issues you might have.",
          icon: "Mail", // Lucide icon name
          title: "Email Support",
          type: "email",
        },
        {
          buttonLink: "/faq",
          buttonText: "View FAQ",
          description:
            "Browse our comprehensive FAQ section to find answers to the most common questions.",
          icon: "HelpCircle", // Lucide icon name
          title: "FAQ",
          type: "faq",
        },
      ],
      title: "Support Channels",
    },

    // Page title and description
    title: "Get in Touch",
  },

  // Currency Configuration
  // This affects currency display across the job board, including job listings and pricing
  currency: {
    // Allowed currencies for job listings
    // This list can include any valid CurrencyCode from lib/constants/currencies.ts
    // Users can specify a subset of supported currencies or allow all by setting to null
    allowedCurrencies: null as CurrencyCode[] | null, // null means all currencies are allowed
    // Default currency code used when no currency is specified
    defaultCurrency: "USD" as CurrencyCode,
  },
  description:
    "Caliber matches candidates to roles and buyers to vendors - one platform for Jobs and Procurement.",

  // Email Provider Configuration
  email: {
    // Encharge configuration
    encharge: {
      // Default tags to apply to subscribers
      defaultTags: "job-alerts-subscriber",

      // Event name for subscriptions
      eventName: "Job Alert Subscription",
      // Your Encharge write key (from Encharge dashboard)
      writeKey: process.env.ENCHARGE_WRITE_KEY,
    },
    // The email provider to use for subscriptions
    provider: process.env.EMAIL_PROVIDER || "encharge",

    // You can add other providers here in the future:
    // mailchimp: { ... },
    // convertkit: { ... },
    // sendgrid: { ... },
  },

  // FAQ Configuration
  faq: {
    // Badge text for hero section
    badge: "FAQ",

    // Categories of FAQs
    categories: [
      {
        items: [
          {
            answer:
              "Caliber is a modern, minimal job board built with Next.js, Tailwind CSS, and Supabase. It features static generation, client-side search, and a clean UI with Geist font.",
            question: "What is Caliber?",
          },
          {
            answer:
              "Yes, browsing jobs on Caliber is completely free. You can search and apply to any listed role at no cost.",
            question: "Is Caliber free to use?",
          },
          {
            answer:
              "Job listings are updated in real-time using Incremental Static Regeneration (ISR) with a 5-minute revalidation period. This means new jobs appear without manual rebuilds.",
            question: "How often are job listings updated?",
          },
        ],
        title: "General Questions",
      },
      {
        items: [
          {
            answer:
              "You can search for jobs using the search bar on the homepage. You can also filter jobs by type, career level, remote work preference, salary range, visa sponsorship status, and languages.",
            question: "How do I search for jobs?",
          },
          {
            answer:
              "Yes, you can subscribe to job alerts to receive notifications when new jobs matching your criteria are posted. Visit the Job Alerts page to set up your preferences.",
            question: "Can I set up job alerts?",
          },
          {
            answer:
              "Each job listing has an 'Apply' button that will direct you to the application page specified by the employer. The application process may vary depending on the employer.",
            question: "How do I apply for a job?",
          },
        ],
        title: "For Job Seekers",
      },
      {
        items: [
          {
            answer:
              "You can post a job by clicking the 'Post a Job' button in the navigation bar. You'll need to create an account and select a pricing plan before posting your job.",
            question: "How do I post a job?",
          },
          {
            answer:
              "A good job posting should include a clear title, company name, job type, salary range, job description, requirements, benefits, and application instructions. The more details you provide, the more qualified candidates you'll attract.",
            question: "What information should I include in my job posting?",
          },
          {
            answer:
              "Job postings are typically visible for 30 days, depending on your selected plan. You can always extend the visibility period by upgrading your plan or renewing your posting.",
            question: "How long will my job posting be visible?",
          },
        ],
        title: "For Employers",
      },
      {
        items: [
          {
            answer:
              "Caliber is built with Next.js, Tailwind CSS, and uses Supabase as the backend.\n\n## Core Technologies\n\n* **Next.js**: For server-side rendering and static site generation\n* **Tailwind CSS**: For utility-first styling\n* **Supabase**: As a flexible backend database\n* **TypeScript**: For type safety and better developer experience\n\nIt also features Incremental Static Regeneration (ISR) for real-time updates and client-side search with memoization.",
            isRichText: true,
            question: "What technologies does Caliber use?",
          },
          {
            answer:
              'Yes, Caliber is designed to be easily customizable. You can modify the configuration file to change the branding, navigation, and other aspects of the job board.\n\n### Key customization options:\n\n- **Branding**: Change the logo, colors, and text\n- **Navigation**: Add or remove menu items\n- **Features**: Enable or disable features like job alerts and RSS feeds\n- **Layout**: Modify the layout and styling\n\nFor more advanced customization, you can extend the codebase to add new features.\n\n```typescript\n// Example config customization\nconst config = {\n  title: "My Custom Job Board",\n  description: "Find your dream job here",\n  // ... more configuration\n};\n```',
            isRichText: true,
            question: "Can I customize Caliber for my own job board?",
          },
          {
            answer:
              'Yes, Caliber includes comprehensive SEO features such as:\n\n1. Automatic XML sitemap generation\n2. Programmatic robots.txt\n3. SEO-friendly URLs with descriptive job slugs\n4. Dynamic sitemap updates every 5 minutes\n5. Structured data for job postings\n\n> "SEO is not just about being search engine-friendly, but also about creating a better user experience."',
            isRichText: true,
            question: "Is Caliber SEO-friendly?",
          },
          {
            answer:
              "Caliber can be deployed to various platforms, with Vercel being the recommended option.\n\n## Deployment Steps\n\n1. Fork the repository\n2. Create your `config.ts` file\n3. Connect your repository to Vercel\n4. Configure environment variables\n5. Deploy!\n\n### Environment Variables\n\n| Variable | Description | Required |\n|----------|-------------|----------|\n| `SUPABASE_URL` | Your Supabase project URL | Yes |\n| `SUPABASE_ANON_KEY` | Your Supabase anon/public API key | Yes |\n| `NEXT_PUBLIC_APP_URL` | Your site URL | Yes |\n\nFor more detailed instructions, please refer to the deployment documentation.",
            isRichText: true,
            question: "How do I deploy my Caliber job board?",
          },
        ],
        title: "Technical Questions",
      },
    ],
    description:
      "Find answers to common questions about our job board and services.",
    // Enable or disable the FAQ page
    enabled: true,

    // Hero image configuration (overrides global setting)
    heroImage: {
      alt: "Frequently Asked Questions", // Custom alt text
      enabled: false, // Enable hero image on the FAQ page
      src: "/faq-hero.jpg", // Custom image path
    },

    // SEO keywords
    keywords:
      "job board FAQ, frequently asked questions, job search help, employer questions",

    // Navigation label
    navigationLabel: "FAQ",

    // Show FAQ link in footer resources
    showInFooter: true,

    // Show FAQ link in navigation
    showInNavigation: true,

    // Page title and description
    title: "Frequently Asked Questions",
  },
  // Font Configuration
  font: {
    // Font family to use throughout the site
    // Available options: "geist" | "inter" | "ibm-plex-serif"
    family: "geist" as FontFamily,

    // Whether to load the font from Google Fonts (for Inter and IBM Plex Serif)
    // IMPORTANT: Must be true for IBM Plex Serif and Inter
    // Geist is self-hosted by default
    useGoogleFonts: true,

    // Font weights to load (applies to Google Fonts)
    // For Geist, the standard weights are loaded automatically
    weights: [400, 500, 600, 700],
  },

  // Footer
  footer: {
    // Brand section (reuses nav social links)
    brand: {
      description:
        "Find your next role. Connect with buyers and suppliers. Two clear paths for your career and your business.",
      // Optional logo configuration specifically for the footer
      logo: {
        alt: "Caliber",
        enabled: true,
        height: 32,
        // Use different image from navbar if needed (e.g., light logo for dark footer)
        src: "/caliber-wordmark-light.svg", // Path to footer-specific logo (light version)
        width: 112,
      },
      order: 1, // Display order in footer grid (lower numbers displayed first)
      show: true,
    },

    // Built with section
    builtWith: {
      link: "https://bordful.com/",
      name: "Bordful",
      show: false,
      showLogo: true,
      text: "Built with",
    },

    // Custom columns - configure as many as needed
    columns: [
      {
        // Automatically add these feature links if they're enabled in config
        autoAddFeatures: {
          contact: true, // Add Contact link if feature is enabled
          faq: true, // Add FAQ link if feature is enabled
          jobAlerts: true, // Add Job Alerts link if feature is enabled
          pricing: true, // Add Pricing link if feature is enabled
        },
        id: "company",
        links: [
          { label: "Home", link: "/" },
          { label: "About", link: "/about" },
          { label: "Changelog", link: "/changelog" },
          { label: "Sitemap", link: "/sitemap.xml" },
        ],
        order: 2,
        show: true,
        title: "Company",
      },
      {
        id: "jobs",
        links: [
          { label: "All Jobs", link: "/jobs" },
          { label: "Job Types", link: "/jobs/types" },
          { label: "Job Locations", link: "/jobs/locations" },
          { label: "Career Levels", link: "/jobs/levels" },
          { label: "Job Languages", link: "/jobs/languages" },
        ],
        order: 3,
        show: true,
        title: "Jobs",
      },
      {
        id: "procurement",
        links: [
          { label: "Overview", link: "/procurement" },
          { label: "Business directory", link: "/procurement/directory" },
          { label: "Public tenders", link: "/procurement/tenders" },
          { label: "Business workspace", link: "/procurement/organizations" },
        ],
        order: 4,
        show: true,
        title: "Procurement",
      },
      {
        id: "legal",
        links: [
          {
            external: false,
            label: "Privacy & Cookies",
            link: "/privacy",
          },
          {
            external: false,
            label: "Terms of Service",
            link: "/terms",
          },
        ],
        order: 5,
        show: true,
        title: "Legal",
      },
    ],

    // Copyright section
    copyright: {
      show: true,
      startYear: 2024,
      text: "Caliber. All rights reserved.",
    },

    // Post Job section
    postJob: {
      button: {
        external: false, // Internal route (was a dead stripe.com link)
        label: "View Plans",
        link: "/pricing",
      },
      description:
        "Feature your role at the top of results, above every aggregated listing.",
      learnMoreButton: {
        external: false,
        label: "Pricing",
        link: "/pricing",
        show: true,
      },
      show: true,
      title: "Hiring? Get Seen Above the Noise",
    },

    // Styling options
    style: {
      // Background color for the footer (CSS color value)
      backgroundColor: "#0C0E12",

      // Border color for the top border of the footer (CSS color value)
      borderColor: "", // Empty string means use the default border color

      // Heading color for section titles in the footer (CSS color value)
      headingColor: "#FFFFFF",

      // Link color for footer links (CSS color value)
      linkColor: "#94979C",

      // Link hover color for footer links on hover (CSS color value)
      linkHoverColor: "#FFFFFF",

      // Text color for regular text in the footer (CSS color value)
      textColor: "#94979C",
    },
  },

  // Note: Schema.org structured data now uses values from other config sections
  // - Website name uses nav.title
  // - Description uses the main description
  // - Social links are derived from navigation settings
  // - Search functionality is automatically included
  // - Publisher is derived from site branding

  // Job Alerts Configuration
  jobAlerts: {
    // Enable or disable the job alerts feature
    enabled: true,

    // Form text configuration
    form: {
      // Button text for the subscribe form
      buttonText: "Subscribe to Job Alerts",

      // Description text under the heading
      description:
        "Get notified when new jobs are posted. We'll also subscribe you to Caliber newsletter.",

      // Form fields configuration
      fields: {
        // Email field labels and errors
        email: {
          invalid: "Please enter a valid email address",
          label: "Email *",
          placeholder: "your@email.com",
          required: "Email is required",
        },
        // Name field labels and errors
        name: {
          label: "Name *",
          placeholder: "Your name",
          required: "Name is required",
        },
      },
      // Heading text for the form section
      heading: "Subscribe for Updates",

      // Loading text when form is being submitted
      loadingText: "Subscribing...",

      // Text for the button to subscribe with another email after success
      resetButtonText: "Subscribe with another email",

      // Success message description after successful subscription
      successDescription:
        "Thank you for subscribing to job alerts. You'll receive emails when jobs matching your interests are posted.",

      // Success message heading after successful subscription
      successHeading: "Subscription Confirmed!",

      // Toast notification messages
      toast: {
        error: {
          description: "Failed to subscribe to job alerts. Please try again.",
          title: "Something went wrong",
        },
        rateLimit: {
          description: "Too many requests. Please try again later.",
          title: "Rate limit exceeded",
        },
        success: {
          description: "You'll now receive job alerts in your inbox.",
          title: "Subscription successful!",
        },
      },
    },

    // Hero section configuration
    hero: {
      // Badge text in hero section
      badge: "Job Alerts",

      // Description text in hero section
      description:
        "Subscribe to job alerts and get notified when new opportunities are posted.",

      // Main title in hero section
      title: "Get Jobs Right to Your Inbox",
    },

    // Hero image configuration (overrides global setting)
    heroImage: {
      alt: "", // Optional custom alt text
      enabled: false, // Disable hero image on the job alerts page
      src: "", // Optional custom image path
    },

    // Navigation label
    navigationLabel: "Job Alerts",

    // The email provider to use (must match a provider in the email section)
    provider: "encharge",

    // Show job alerts link in footer resources
    showInFooter: true,

    // Show job alerts link in navigation
    showInNavigation: true,
  },

  // Job Listings Configuration
  jobListings: {
    // Default page title for job listings
    defaultPageTitle: "Latest Opportunities",

    // Default number of jobs per page
    defaultPerPage: 10,

    // Default sort order
    defaultSortOrder: "newest" as "newest" | "oldest" | "salary",

    // Default number of days a job posting is considered valid if an expiration date
    // is not explicitly provided by the source. Used in structured data (schema.org).
    defaultValidityDays: 30,

    // UI Labels Configuration
    labels: {
      // Per page dropdown label
      perPage: {
        show: true,
        text: "Jobs per page:",
      },

      // Sort order dropdown label
      sortOrder: {
        show: true,
        text: "Sort by:",
      },
    },

    // Available sort options
    sortOptions: ["newest", "oldest", "salary"] as const,
  },

  // Job Report Configuration
  jobReport: {
    // Button text
    buttonText: "Report",

    // Email address to send reports to
    email: "hello@caliber.com",

    // Message template for the report email
    // Available placeholders:
    // [Job Title] - The title of the job
    // [Job URL] - The full URL of the job posting
    emailMessage:
      "I would like to report the following job posting:\n\nJob Title: [Job Title]\nJob URL: [Job URL]\n\nReason for reporting:",

    // Subject line for the report email
    emailSubject: "Job Report: [Job Title]",
    // Enable or disable the job report feature
    enabled: true,

    // Whether to show the report button in the job details sidebar
    showInSidebar: true,
  },

  // Jobs Pages Configuration
  jobsPages: {
    // Main Jobs directory page
    directory: {
      // Hero image configuration (overrides global setting)
      heroImage: {
        alt: "", // Optional custom alt text
        enabled: false, // Disable hero image on the main jobs directory page
        src: "", // Optional custom image path
      },
    },
    // Dynamic Pages
    dynamicPages: {
      // Specific language pages (e.g., /jobs/language/en)
      language: {
        // Hero image configuration (overrides global setting)
        heroImage: {
          alt: "", // Optional custom alt text
          enabled: false, // Disable hero image on specific language pages
          src: "", // Optional custom image path
        },
      },
      // Specific level pages (e.g., /jobs/level/senior)
      level: {
        // Hero image configuration (overrides global setting)
        heroImage: {
          alt: "", // Optional custom alt text
          enabled: false, // Disable hero image on specific level pages
          src: "", // Optional custom image path
        },
      },
      // Specific location pages (e.g., /jobs/location/remote)
      location: {
        // Hero image configuration (overrides global setting)
        heroImage: {
          alt: "", // Optional custom alt text
          enabled: false, // Disable hero image on specific location pages
          src: "", // Optional custom image path
        },
      },
      // Specific type pages (e.g., /jobs/type/full-time)
      type: {
        // Hero image configuration (overrides global setting)
        heroImage: {
          alt: "", // Optional custom alt text
          enabled: false, // Disable hero image on specific type pages
          src: "", // Optional custom image path
        },
      },
    },
    // Job Languages page
    languages: {
      // Hero image configuration (overrides global setting)
      heroImage: {
        alt: "", // Optional custom alt text
        enabled: false, // Disable hero image on the job languages page
        src: "", // Optional custom image path
      },
    },
    // Job Levels page
    levels: {
      // Hero image configuration (overrides global setting)
      heroImage: {
        alt: "", // Optional custom alt text
        enabled: false, // Disable hero image on the job levels page
        src: "", // Optional custom image path
      },
    },
    // Job Locations page
    locations: {
      // Hero image configuration (overrides global setting)
      heroImage: {
        alt: "", // Optional custom alt text
        enabled: false, // Disable hero image on the job locations page
        src: "", // Optional custom image path
      },
    },
    // Job Types page
    types: {
      // Hero image configuration (overrides global setting)
      heroImage: {
        alt: "", // Optional custom alt text
        enabled: false, // Disable hero image on the job types page
        src: "", // Optional custom image path
      },
    },
  },

  // Navigation
  nav: {
    bluesky: {
      show: false, // Add your own Bluesky link later
      url: "",
    },
    github: {
      show: false, // GitHub removed for now — add your own repo link later
      url: "",
    },
    linkedin: {
      show: false, // Add your own LinkedIn link later
      url: "",
    },
    logo: {
      alt: "Caliber", // Alt text for the logo
      enabled: true, // Set to true to use a custom logo instead of icon + text
      height: 30, // Height of the logo in pixels
      src: "/caliber-wordmark.svg", // Path to your logo image (place it in the public directory)
      width: 105, // Width of the logo in pixels
    },
    // White-stroke variant swapped in automatically for dark mode (see
    // Nav's logoSrc logic) - the black-stroke logo.src above is invisible
    // against a dark background otherwise.
    logoDark: "/caliber-wordmark-light.svg",
    // Kept to a small number of top-level items on purpose - About/Pricing/
    // Contact and Job Alerts used to sit as their own flat links next to the
    // two existing dropdowns, which crowded the desktop bar. They're folded
    // into "Jobs"/"Company" dropdowns instead so the primary row stays
    // short. Procurement is a deliberate exception (proc.md §2/§7): it's a
    // separate product surface, not a job-board feature, so it gets its own
    // top-level slot rather than living inside "Jobs".
    menu: [
      { label: "Home", link: "/" },
      {
        dropdown: true,
        items: [
          { label: "All Jobs", link: "/jobs" },
          { label: "Job Types", link: "/jobs/types" },
          { label: "Job Locations", link: "/jobs/locations" },
          { label: "Job Levels", link: "/jobs/levels" },
          { label: "Job Languages", link: "/jobs/languages" },
          { label: "Job Alerts", link: "/job-alerts" },
          { label: "Post a job", link: "/pricing" },
        ],
        label: "Jobs",
        link: "/jobs",
      },
      {
        dropdown: true,
        items: [
          { label: "Overview", link: "/procurement" },
          { label: "Business Directory", link: "/procurement/directory" },
          { label: "Tenders", link: "/procurement/tenders" },
        ],
        label: "Procurement",
        link: "/procurement",
      },
      {
        dropdown: true,
        items: [
          { label: "Career Guides", link: "/guides" },
          { label: "MasterClasses", link: "/masterclasses" },
        ],
        label: "Resources",
        link: "/guides",
      },
      {
        dropdown: true,
        items: [
          { label: "About", link: "/about" },
          { label: "Pricing", link: "/pricing" },
          { label: "Contact", link: "/contact" },
        ],
        label: "Company",
        link: "/about",
      },
    ],
    postJob: {
      external: false, // Internal route
      label: "Post a Job", // Button text
      link: "/pricing", // Send to the pricing page (was a dead stripe.com link)
      show: true, // Whether to show the Post Job button
      variant: "primary" as
        | "default"
        | "primary"
        | "outline"
        | "secondary"
        | "ghost"
        | "link", // Button variant
    },
    reddit: {
      show: false, // Add your own Reddit link later
      url: "",
    },
    title: "Caliber", // The text shown in the navigation bar
    twitter: {
      show: false, // Add your own X/Twitter link later
      url: "",
    },
  } as NavConfig,

  // Open Graph Image Configuration
  og: {
    // Background color (defaults to heroBackgroundColor if not specified)
    backgroundColor: null, // Use null to default to heroBackgroundColor

    // Background image (path from public folder)
    backgroundImage: "/office.jpg",

    // Background color overlay opacity (0-1, where 1 is fully opaque)
    backgroundOpacity: 0.9,

    // Description to display (defaults to site description if not specified)
    description: null, // Use null to default to site description

    // Description color (defaults to heroSubtitleColor if not specified)
    descriptionColor: null, // Use null to default to heroSubtitleColor
    // Enable or disable custom OG image
    enabled: true,

    // Font configuration (defaults to site font if not specified)
    font: {
      // Override the font family just for OG image
      family: null, // Use null to default to site font.family
    },

    // Gradient overlay (bottom to top fade)
    gradient: {
      angle: 0, // Degrees - 90 means bottom to top
      color: null, // Uses backgroundColor if not specified
      enabled: true,
      endOpacity: 1, // Opacity at the bottom (0-1)
      startOpacity: 0, // Opacity at the top (0-1)
    },

    // Job-specific OG image configuration
    jobs: {
      // Background color (defaults to heroBackgroundColor if not specified)
      backgroundColor: null, // Use null to default to heroBackgroundColor

      // Background image (path from public folder)
      backgroundImage: "/office.jpg",

      // Background color overlay opacity (0-1, where 1 is fully opaque)
      backgroundOpacity: 0.9,

      // Company name color
      companyColor: null, // Use null to default to heroTitleColor

      // Details color (job type, location, salary)
      detailsColor: null, // Use null to default to heroSubtitleColor
      // Enable or disable job-specific OG images
      enabled: true,

      // Font configuration (defaults to site font if not specified)
      font: {
        // Override the font family just for job OG images
        family: null, // Use null to default to site font.family
      },

      // Gradient overlay
      gradient: {
        angle: 0, // Degrees
        color: null, // Uses backgroundColor if not specified
        enabled: true,
        endOpacity: 1, // Opacity at the end (0-1)
        startOpacity: 0, // Opacity at the start (0-1)
      },

      // Logo configuration
      logo: {
        height: 56, // Height in pixels
        // Show or hide logo in job OG images
        show: true,

        // Logo source path (direct path from public folder)
        src: "/caliber-wordmark-light.svg",

        // Logo dimensions
        width: 185, // IMPORTANT: Use a fixed pixel value
      },
      showJobType: true, // Show job type (Full-time, Part-time, etc.)
      showLocation: true, // Show job location

      // Job details to display
      showSalary: true, // Show salary information if available

      // Title color (defaults to heroTitleColor if not specified)
      titleColor: null, // Use null to default to heroTitleColor
    },

    // Logo configuration
    logo: {
      height: 56, // Height in pixels

      // Logo positioning
      position: {
        left: 60, // Position from left in pixels
        top: 60, // Position from top in pixels
      },
      // Show or hide logo in OG image
      show: true,

      // Logo source path (direct path from public folder)
      // Examples: "/caliber-wordmark.svg", "/logo/my-logo.png", etc.
      src: "/caliber-wordmark-light.svg",

      // Logo dimensions
      width: 185, // IMPORTANT: Use a fixed pixel value, "auto" doesn't work reliably
    },

    // Title to display (defaults to site title if not specified)
    title: null, // Use null to default to site title

    // Title color (defaults to heroTitleColor if not specified)
    titleColor: null, // Use null to default to heroTitleColor
  },

  // Post Job Banner Configuration
  postJobBanner: {
    companyAvatars: [
      {
        alt: "Best Writing",
        fallback: "BW",
        src: "/avatars/bestwriting.png",
      },
      {
        alt: "Marketful",
        fallback: "MF",
        src: "/avatars/marketful.png",
      },
      {
        alt: "UI Things",
        fallback: "UI",
        src: "/avatars/uithings.png",
      },
      {
        alt: "Best Writing",
        fallback: "BW",
        src: "/avatars/bestwriting.png",
      },
    ],

    // Call to action
    cta: {
      external: true,
      link: "https://buy.stripe.com/fZeg1n8eg07m0lGfZn",
      text: "Post a Job ($59)",
    },
    description: "Reach talented professionals. Get quality applications fast.",
    // Enable or disable the post job banner
    // Disabled 2026-07: cta.link below pointed to a placeholder Stripe
    // Payment Link, not a real checkout - re-enable once a real one exists.
    enabled: false,

    // Trust indicators
    showTrustedBy: true,

    // Banner content
    title: "Hiring? Post Your Job Ad Here",
    trustedByText: "Trusted by top companies",

    // Trust message
    trustMessage: "30-day money-back guarantee",
  },

  // Pricing Configuration
  pricing: {
    // Badge text for hero section
    badge: "Pricing",

    // Currency for pricing display
    currency: "USD" as CurrencyCode,
    description:
      "Caliber aggregates thousands of jobs. Featuring yours puts it at the top, above the noise.",
    // Enable or disable the pricing page
    enabled: true,

    // Hero image configuration (overrides global setting)
    heroImage: {
      alt: "", // Optional custom alt text
      enabled: false, // Disable hero image on the pricing page
      src: "", // Optional custom image path
    },

    // SEO keywords
    keywords:
      "featured job posting, promote job listing, job board pricing, recruitment advertising",

    // Navigation label
    navigationLabel: "Pricing",

    // Payment method icons to display
    paymentMethods: {
      enabled: true,
      icons: [
        { alt: "Visa", name: "visa" },
        { alt: "Mastercard", name: "mastercard" },
        { alt: "American Express", name: "amex" },
        { alt: "Apple Pay", name: "applepay" },
        { alt: "Google Pay", name: "googlepay" },
        { alt: "PayPal", name: "paypal" },
      ],
    },

    // Currency symbol is now derived from the currency selected above
    // No need to manually specify the symbol anymore

    // Payment processing information (displayed below pricing cards)
    paymentProcessingText:
      "Payments are processed & secured by Stripe. Price in USD. VAT may apply.",

    // Plans configuration
    //
    // Model note: Caliber is an aggregator - the feed is mostly jobs scraped
    // from many sources. Charging employers to *post* into that feed doesn't
    // work (their listing drowns among thousands of free aggregated ones).
    // So the paid product is *visibility*: getting a role pinned/highlighted
    // ABOVE the aggregated noise. Each tier is a clean step up in reach, and
    // billing terms are directly comparable (forever / per job / per month).
    //
    // CTA links point to /contact as a functional interim - swap them to
    // real Stripe Checkout / Payment Link URLs once checkout is wired up.
    plans: [
      {
        badge: null,
        billingTerm: "forever",
        cta: {
          label: "List a Job",
          link: "/contact",
          variant: "outline", // Using button variants
        },
        description:
          "List your role in the feed alongside every aggregated job.",
        features: [
          "1 standard listing",
          "Appears in search & all filters",
          "30-day visibility",
          "Community support",
        ],
        highlighted: false,
        name: "Free",
        price: 0,
      },
      {
        badge: {
          text: "Most popular",
          type: "featured",
        },
        billingTerm: "per job",
        cta: {
          label: "Feature a Job",
          link: "/contact",
          variant: "default", // Using button variants
        },
        description:
          "Rise above the aggregated listings - pinned, highlighted, and seen.",
        features: [
          "Everything in Free",
          "Pinned to the top of results",
          '"Featured" highlight badge',
          "60-day visibility",
          "Company profile & logo",
          "Email support",
        ],
        highlighted: true,
        name: "Featured",
        price: 29,
      },
      {
        badge: {
          text: "Best for agencies",
          type: "featured",
        },
        billingTerm: "per month",
        cta: {
          label: "Go Unlimited",
          link: "/contact",
          variant: "default", // Using button variants
        },
        description:
          "For teams hiring continuously across roles.",
        features: [
          "Unlimited featured listings",
          "Priority placement",
          "Advanced analytics",
          "Applicant tracking",
          "Dedicated support",
        ],
        highlighted: false,
        name: "Unlimited",
        price: 99,
      },
    ],

    // Show pricing link in footer resources
    showInFooter: true,

    // Show pricing link in navigation
    showInNavigation: true,

    // Page title and description
    title: "Get Your Role Seen",
  },

  // Quick Stats Configuration
  quickStats: {
    // Enable or disable the quick stats section
    enabled: true,

    // Configure individual stat sections
    sections: {
      // Last Updated timestamp
      lastUpdated: {
        enabled: true,
        title: "Last Updated",
      },
      // Open Jobs counter
      openJobs: {
        enabled: true,
        showNewJobsIndicator: true,
        title: "Open Jobs",
      },

      // Trending Companies
      trending: {
        enabled: true,
        maxCompanies: 3,
        title: "Trending",
      },
    },
  },

  // RSS Feed Configuration
  rssFeed: {
    // Number of job description characters to include (preview length)
    descriptionLength: 500,
    // Enable or disable RSS feeds
    enabled: true,

    // Footer label (if showing in footer)
    footerLabel: "Job Feeds",

    // Available formats (enable/disable specific formats)
    formats: {
      atom: true, // Atom format
      json: true, // JSON Feed format
      rss: true, // RSS 2.0 format
    },

    // Navigation label (if showing in navigation)
    navigationLabel: "RSS Feed",

    // Show RSS feed links in footer
    showInFooter: true,

    // Show RSS feed links in navigation
    showInNavigation: true,

    // Title for the RSS feed
    title: "Latest Jobs Feed",
  },

  // Scripts Configuration (analytics, tracking, etc.)
  scripts: {
    body: [] as CustomScript[],
    head: [] as CustomScript[],
  },

  // Search Configuration
  search: {
    // ARIA label for accessibility
    ariaLabel: "Search jobs",

    // Debounce time in milliseconds
    debounceMs: 500,
    // Default placeholder text for search inputs
    placeholder: "Search by role, company, or location...",

    // Show search on all job pages (including subpages)
    showOnAllPages: true,
  },
  // This is the site-wide title suffix (every page's <title> reads
  // "{Page} | {this}") and the default meta description - left over from
  // before the matchmaking repositioning, still pure job-board copy on
  // every single tab and search result regardless of which product
  // surface (jobs or procurement) the visitor is actually on.
  title: "Caliber",

  // UI Configuration
  ui: {
    // Hero section background color (CSS color value)
    // Can be hex, rgb, hsl, etc. Leave empty for default.
    heroBackgroundColor: "#042454", // Example: light gray background

    // Hero section background image
    // Takes precedence over both gradient and solid background when enabled
    // Disabled: the branded heroGradient above is the intended hero
    // background (see its comment) - leaving this enabled too made it win
    // on precedence, showing a dark, low-contrast stock photo instead and
    // making the hero text hard to read.
    heroBackgroundImage: {
      enabled: false, // Set to true to enable background image
      // Optional overlay for better text readability
      overlay: {
        color: "rgba(9, 130, 172, 0.75)", // Brand blue (#0982AC) tint
        enabled: true, // Set to true to enable a color overlay
        opacity: 0.75, // Opacity value from 0 to 1 (alternative to using rgba)
      },
      position: "center", // CSS background-position value
      size: "cover", // CSS background-size value: "cover", "contain", "100% auto", etc.
      src: "https://images.unsplash.com/photo-1565164370954-8eac883fb7c8?w=1920&q=80&auto=format&fit=crop",
    },

    // Hero Badge custom Tailwind classes (for specific color styling)
    // Example: "bg-teal-100 text-teal-800 border-teal-200"
    // heroBadgeClassName: "bg-white", // REMOVED for V1 simplicity

    // Optional: Override badge background color (CSS color value)
    heroBadgeBgColor: "#fff", // Example: "#ffffff"

    // Optional: Override badge border color (CSS color value, mainly for outline variant)
    heroBadgeBorderColor: "#fff", // Example: "#ffffff"

    // Optional: Override badge text color (CSS color value)
    heroBadgeTextColor: "#083344", // Example: "#005450"

    // Hero Badge variant (controls base style)
    // Options: "default", "secondary", "outline", "destructive"
    heroBadgeVariant: "outline" as
      | "default"
      | "secondary"
      | "outline"
      | "destructive",

    // Hero section gradient background
    // Takes precedence over heroBackgroundColor when enabled
    heroGradient: {
      // For radial gradients: "circle", "ellipse at center", etc.
      colors: [
        "#065C79", // Start color (deep blue)
        "#0982AC", // Middle color (brand primary)
        "#0BA6DA", // End color (lighter blue)
      ],
      direction: "135deg", // For linear gradients: "to right", "to bottom", "45deg", etc.
      // Branded gradient (matches ui.primaryColor #0982AC) replaces the
      // generic stock-photo swirl background - ties the hero to the site's
      // actual identity instead of a random blue/black image with no
      // connection to Caliber, and drops an external image dependency.
      enabled: true, // Set to true to enable gradient background
      // Optional stops for precise control (0-100%)
      // If not provided, colors will be evenly distributed
      stops: ["0%", "50%", "100%"],
      type: "linear" as "linear" | "radial", // Type of gradient: "linear" or "radial"
    },

    // Optional: Configure an image for the right side of the hero section
    // Free-to-use (no attribution required), verified live 2026-07: Photo by
    // Brooke Cagle on Unsplash (images.unsplash.com/photo-1572021335469-...)
    heroImage: {
      alt: "Team of coworkers smiling and collaborating around a laptop",
      enabled: true, // Set to false to disable the image
      src: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=1000&q=80&auto=format&fit=crop",
    },

    // Optional: Set search input background color (CSS color value)
    heroSearchBgColor: "#fff", // Example: "#ffffff"

    // Hero section stats text color (CSS color value)
    // Can be hex, rgb, hsl, etc. Leave empty for default.
    heroStatsColor: "#fff", // Example: "text-gray-500"

    // Hero section subtitle color (CSS color value)
    // Can be hex, rgb, hsl, etc. Leave empty for default.
    heroSubtitleColor: "#fff", // Example: "text-gray-600"

    // Hero section main title color (CSS color value)
    // Can be hex, rgb, hsl, etc. Leave empty for default.
    heroTitleColor: "#fff", // Example: "text-gray-900"

    // Primary color used throughout the site (buttons, links, etc.)
    // Can be hex, rgb, hsl, etc. Leave empty for default.
    primaryColor: "#0982AC", // Example: amber color
  },
  url:
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://job-portal-ten-pi.vercel.app"),
} as const;

export type Config = typeof config;
export default config;
