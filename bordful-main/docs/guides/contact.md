---
title: Contact Page Customization
description: Configure and customize the contact page, support channels, and contact information for your Bordful job board.
lastUpdated: "2025-05-22"
---

Bordful includes a fully customizable contact page that allows you to provide multiple support channels and contact information to your users.

## Key Features

- Configurable support channels with customizable cards
- Detailed contact information section
- Schema.org structured data for better SEO
- Support for all Lucide icons
- Mobile-responsive design that looks great on all devices
- Flexible configuration for enabling/disabling the contact page

## Basic Configuration

The contact page is configured through the `contact` section in your `config/config.ts` file:

```typescript
contact: {
  // Enable or disable the contact page
  enabled: true,

  // Show contact link in navigation
  showInNavigation: true,

  // Show contact link in footer
  showInFooter: true,

  // Navigation label
  navigationLabel: "Contact",

  // Badge text for hero section
  badge: "Contact Us",

  // Page title and description
  title: "Get in Touch",
  description: "Have questions or feedback? We'd love to hear from you.",
  
  // Hero image configuration (overrides global setting)
  heroImage: {
    enabled: false, // Disable hero image on the contact page
    src: "", // Optional custom image path
    alt: "", // Optional custom alt text
  },

  // SEO keywords
  keywords: "contact us, support, help, questions, feedback, get in touch",
  
  // Support channels section
  supportChannels: {
    // Configuration for support channels (see below)
  },
  
  // Contact information section
  contactInfo: {
    // Configuration for contact information (see below)
  },
  
  // Schema.org structured data customization
  schema: {
    description: "Get in touch with our team for any questions or support needs.",
  },
}
```

### Enabling/Disabling the Contact Page

You can completely enable or disable the contact page with the `enabled` setting:

```typescript
contact: {
  enabled: true, // Set to false to disable the contact page
}
```

When disabled, any attempts to access the `/contact` route will display a "Contact Page Not Available" message with a link to return home.

### Navigation and Footer Integration

Control whether the contact page appears in your navigation bar and footer:

```typescript
contact: {
  showInNavigation: true, // Show in navigation bar
  showInFooter: true, // Show in footer resources
  navigationLabel: "Contact", // Custom label for navigation links
}
```

### Page Title and Description

Customize the main heading and subheading on the contact page:

```typescript
contact: {
  title: "Get in Touch",
  description: "Have questions or feedback? We'd love to hear from you.",
}
```

### Hero Section Customization

You can customize the hero section specifically for the contact page:

```typescript
contact: {
  // Badge text displayed above the title
  badge: "Contact Us",
  
  // Hero image configuration (overrides global setting)
  heroImage: {
    enabled: false, // Disable hero image on the contact page
    src: "", // Optional custom image path
    alt: "", // Optional custom alt text
  },
}
```

This allows you to have different hero styling on the contact page compared to the rest of your site.

### SEO Configuration

Optimize your contact page for search engines:

```typescript
contact: {
  // SEO keywords
  keywords: "contact us, support, help, questions, feedback, get in touch",
}
```

## Support Channels Section

The `supportChannels` section allows you to configure multiple support channel cards:

```typescript
supportChannels: {
  title: "Support Channels",
  channels: [
    {
      type: "email",
      title: "Email Support",
      description: "Our support team is available to help you with any questions or issues you might have.",
      buttonText: "Contact via Email",
      buttonLink: "mailto:hello@bordful.com",
      icon: "Mail" // Lucide icon name
    },
    {
      type: "twitter",
      title: "Twitter/X Support",
      description: "Get quick responses and stay updated with our latest announcements on Twitter/X.",
      buttonText: "Follow on Twitter/X",
      buttonLink: "https://twitter.com/bordful",
      icon: "Twitter" // Lucide icon name
    },
    {
      type: "faq",
      title: "FAQ",
      description: "Browse our comprehensive FAQ section to find answers to the most common questions.",
      buttonText: "View FAQ",
      buttonLink: "/faq",
      icon: "HelpCircle" // Lucide icon name
    }
  ]
}
```

### Support Channel Configuration Options

Each channel in the `channels` array can have the following properties:

- `type`: A identifier for the channel type (e.g., "email", "twitter", "faq")
- `title`: The title displayed at the top of the channel card
- `description`: A brief description of the support channel
- `buttonText`: The text displayed on the channel's button
- `buttonLink`: The URL the button links to (can be an email link with `mailto:`)
- `icon`: The Lucide icon name to display (see Supported Icons below)

### Supported Icons

The contact page supports all [Lucide icons](https://lucide.dev/icons), with the following pre-configured for convenience:

- `Mail` - For email support
- `Twitter` - For Twitter/X support
- `HelpCircle` - For FAQ or help center
- `Phone` - For phone support
- `MessageSquare` - For chat support
- `Github` - For GitHub support
- `Linkedin` - For LinkedIn support
- `Rss` - For RSS feeds

## Contact Information Section

The `contactInfo` section allows you to display your company's contact details:

```typescript
contactInfo: {
  title: "Contact Information",
  description: "Here's how you can reach us directly.",
  companyName: "Bordful Inc.",
  email: "hello@bordful.com",
  phone: "+1 (555) 123-4567",
  address: "123 Main Street, San Francisco, CA 94105"
}
```

### Contact Information Configuration Options

- `title`: The title displayed at the top of the contact information section
- `description`: A brief description for the contact information section
- `companyName`: Your company's name
- `email`: Your contact email address
- `phone`: Your contact phone number
- `address`: Your physical address

## Schema.org Structured Data

The contact page automatically includes Schema.org structured data for better SEO. You can customize the description:

```typescript
schema: {
  description: "Get in touch with our team for any questions or support needs."
}
```

If not provided, the system will use the contact page description.

## Examples

### Minimal Contact Page

```typescript
contact: {
  enabled: true,
  showInNavigation: true,
  showInFooter: true,
  navigationLabel: "Contact",
  title: "Contact Us",
  description: "Get in touch with our team.",
  supportChannels: {
    title: "How to Reach Us",
    channels: [
      {
        type: "email",
        title: "Email Us",
        description: "Send us an email and we'll get back to you.",
        buttonText: "Email Us",
        buttonLink: "mailto:contact@example.com",
        icon: "Mail"
      }
    ]
  },
  contactInfo: {
    title: "Our Details",
    description: "Here's our contact information.",
    companyName: "Example Inc.",
    email: "contact@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main Street, Anytown, USA"
  }
}
```

### Multi-Channel Support Page

```typescript
contact: {
  enabled: true,
  showInNavigation: true,
  showInFooter: true,
  navigationLabel: "Support",
  title: "Customer Support",
  description: "We're here to help you with any questions or issues.",
  badge: "Support Options",
  supportChannels: {
    title: "Support Channels",
    channels: [
      {
        type: "email",
        title: "Email Support",
        description: "Our support team is available 24/7 to assist you with any questions.",
        buttonText: "Email Support",
        buttonLink: "mailto:support@example.com",
        icon: "Mail"
      },
      {
        type: "chat",
        title: "Live Chat",
        description: "Chat with our support team in real-time during business hours.",
        buttonText: "Start Chat",
        buttonLink: "/chat",
        icon: "MessageSquare"
      },
      {
        type: "phone",
        title: "Phone Support",
        description: "Call us directly for urgent issues or complex questions.",
        buttonText: "Call Support",
        buttonLink: "tel:+15551234567",
        icon: "Phone"
      },
      {
        type: "faq",
        title: "Knowledge Base",
        description: "Browse our comprehensive FAQ and help articles.",
        buttonText: "Visit Knowledge Base",
        buttonLink: "/faq",
        icon: "HelpCircle"
      },
      {
        type: "github",
        title: "GitHub Issues",
        description: "Report technical issues or contribute to our open source code.",
        buttonText: "Open GitHub",
        buttonLink: "https://github.com/yourusername/yourrepo/issues",
        icon: "Github"
      },
      {
        type: "twitter",
        title: "Twitter Support",
        description: "Reach out to us on Twitter for quick responses to simple questions.",
        buttonText: "Tweet @Us",
        buttonLink: "https://twitter.com/yourusername",
        icon: "Twitter"
      }
    ]
  },
  contactInfo: {
    title: "Corporate Headquarters",
    description: "Our main office contact information.",
    companyName: "Enterprise Corp.",
    email: "contact@enterprise.com",
    phone: "+1 (555) 987-6543",
    address: "555 Corporate Blvd, Suite 100, San Francisco, CA 94105"
  }
}
```

## Best Practices

1. **Clear Channel Descriptions**: Make each support channel's purpose clear
2. **Appropriate Icons**: Choose icons that visually represent each support channel
3. **Action-Oriented Button Text**: Use clear, action-oriented text for buttons
4. **Response Expectations**: Set expectations for response times where appropriate
5. **Up-to-Date Information**: Ensure contact information is current and accurate
6. **Multiple Channels**: Provide different support options for different needs
7. **Mobile Testing**: Test how the contact cards display on mobile devices

## Implementation Details

The contact page is implemented in `app/contact/page.tsx`, which reads the configuration from `config/config.ts` and renders the appropriate layout and content.

## Related Documentation

- [Navigation Customization](/docs/guides/navigation.md)
- [Footer Customization](/docs/guides/footer.md)
- [Schema.org Implementation](/docs/advanced/schema-implementation.md)
- [Configuration Options](/docs/reference/configuration-options.md) 