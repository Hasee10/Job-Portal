---
title: Technical Glossary
description: Comprehensive glossary of technical terms used throughout the Bordful job board platform.
lastUpdated: "2025-05-22"
---

# Technical Glossary

This glossary provides definitions for technical terms used throughout the Bordful documentation and platform. Use this reference to understand specific terminology related to job boards, web development, and Bordful-specific features.

## A

### Airtable
A cloud-based database and spreadsheet hybrid platform used as the primary data store for Bordful job listings and configuration.

### API (Application Programming Interface)
A set of protocols that allows different software applications to communicate with each other. Bordful uses APIs to interact with external services like Airtable, email providers, and analytics platforms.

### API Route
Server-side endpoints in Next.js that handle API requests. Bordful uses API routes for features like job alert subscriptions and data fetching.

### App Router
Next.js 13+ routing system that enables file-system based routing with support for layouts, loading states, and error boundaries. Bordful is built using the App Router architecture.

## B

### Badge
A visual element used to highlight or categorize content. In Bordful, badges are used to indicate job types, featured status, and other job attributes.

### Breadcrumbs
A navigation aid that shows users their location within the website hierarchy. Bordful implements breadcrumbs with schema.org markup for improved SEO.

## C

### Career Level
A categorization of job seniority or experience level. Bordful supports various career levels like Internship, Junior, Mid-Level, Senior, etc.

### Client Component
A React component that renders on the client side. Used in Bordful for interactive elements like search forms and filters.

### CMS (Content Management System)
A software application used to create and manage digital content. Airtable functions as a headless CMS for Bordful.

### Config
The configuration file (config/config.ts) that controls Bordful's appearance, features, and behavior.

### Currency Code
A three-letter code (ISO 4217) representing a currency. Bordful supports multiple currency codes for job salary information.

## D

### Data Revalidation
The process of updating cached data. Bordful uses Next.js's ISR (Incremental Static Regeneration) for efficient data revalidation.

### Deployment
The process of making a website available on the internet. Bordful can be deployed to platforms like Vercel, Netlify, or self-hosted environments.

### Dynamic Route
A route that depends on external data, like a job slug or category name. Bordful uses dynamic routes for job details, category pages, etc.

## E

### Email Provider
A service used to send emails. Bordful integrates with email providers like Encharge for job alert notifications.

### Environment Variable
A variable whose value is set outside the program, typically for configuration. Bordful uses environment variables for API keys, database connections, etc.

## F

### Featured Jobs
A selection of highlighted job listings that appear at the top of job listings. Configured through the featuredCount and featuredCriteria options.

### Filter
A mechanism that allows users to narrow down job listings based on criteria like location, job type, and salary range.

### Footer
The bottom section of the website that contains links to important pages, social media, and copyright information.

## G

### Google Jobs
A job search feature in Google Search that displays job listings directly in search results. Bordful provides schema.org markup compatible with Google Jobs.

## H

### Hero Section
A prominent section at the top of a webpage designed to capture attention. Bordful's hero sections are highly customizable with gradients, backgrounds, and images.

### Headless CMS
A content management system that focuses on storing and delivering content without a front-end presentation layer. Bordful uses Airtable as a headless CMS.

## I

### Incremental Static Regeneration (ISR)
A Next.js feature that allows static pages to be updated after deployment without rebuilding the entire site. Bordful uses ISR for job listings and other dynamic content.

### Internationalization (i18n)
The process of designing software to support multiple languages. Bordful includes a comprehensive language system for multilingual job boards.

## J

### Job Alert
A subscription feature that notifies users when new jobs matching their criteria are posted.

### Job Posting Schema
A structured data format (schema.org/JobPosting) used to markup job listings for search engines and job aggregators.

### Job Type
A classification of employment arrangement such as full-time, part-time, contract, or remote.

## L

### Language Code
A two-letter code (ISO 639-1) representing a language. Bordful supports numerous language codes for multilingual job requirements.

### Layout
A reusable UI structure that wraps multiple pages. Bordful uses layouts for consistent header, footer, and sidebars across pages.

## M

### Markdown
A lightweight markup language used for formatting text. Bordful supports markdown for job descriptions and other content.

### Metadata
Information about a webpage used by browsers and search engines. Bordful automatically generates SEO-friendly metadata for all pages.

## N

### Navigation
The menu system that allows users to move between different sections of the website.

### Next.js
A React framework used to build Bordful. Provides features like server-side rendering, static site generation, and API routes.

## O

### OG Image
Open Graph images displayed when sharing links on social media platforms. Bordful can generate dynamic OG images for job listings.

## P

### Pagination
The division of content into separate pages. Bordful implements pagination for job listings to improve performance and user experience.

### Personal Access Token (PAT)
A type of authentication token used to access APIs. Bordful uses PATs to connect to Airtable.

## R

### Rate Limiting
Restricting the number of requests a user can make to an API within a specific time window. Bordful implements rate limiting to protect API endpoints.

### Remote Job
A job that can be performed from anywhere or specific regions, rather than at a physical office location.

### Revalidation
The process of refreshing cached content. Bordful uses Next.js's on-demand revalidation for keeping job listings up to date.

### Rich Results
Enhanced search results with additional information and formatting. Bordful's schema.org implementation enables rich results for job listings.

### RSS Feed
A web feed that allows users to access updates to websites. Bordful generates RSS feeds for job listings.

## S

### Schema.org
A collaborative vocabulary for structured data markup on web pages. Bordful implements schema.org markup for improved SEO.

### Server Component
A React component that renders on the server. Used in Bordful for data fetching and initial page rendering.

### Sitemap
A file that lists a website's pages to help search engines discover and index content. Bordful automatically generates XML sitemaps.

### Static Site Generation (SSG)
A technique where pages are rendered at build time rather than on each request. Bordful uses SSG for improved performance.

### Structured Data
Standardized format for providing information about a page and classifying its content. Bordful implements structured data for job listings and website information.

## T

### Tailwind CSS
A utility-first CSS framework used for styling Bordful's user interface.

### TypeScript
A strongly typed programming language that builds on JavaScript. Bordful is written in TypeScript for improved developer experience and code reliability.

## U

### UI Component
A reusable piece of user interface, like buttons, cards, or forms. Bordful includes a comprehensive set of UI components.

### URL Parameter
A key-value pair in a URL that controls page behavior. Bordful uses URL parameters for filtering and pagination.

## W

### Webhook
An HTTP callback that occurs when something happens. Bordful can use webhooks for integrations with notification services and other external systems.

### WebSite Schema
A structured data format (schema.org/WebSite) used to provide information about a website to search engines. Bordful implements WebSite schema on all pages.

## Additional Terms

### Bordful-Specific Terms

#### Job Alert Subscription
A feature allowing users to subscribe to notifications about new job postings matching their criteria.

#### Multi-Currency System
Bordful's system for handling and displaying salaries in multiple currencies, including conversion and formatting.

#### Enhanced Language System
Bordful's comprehensive language handling system for multilingual job boards.

#### Direct Apply
A flag indicating whether users can apply directly through the job board or will be redirected to an external application site.

#### Remote Region
A geographic area where remote workers must be located for a specific job (e.g., "US-only remote" or "EU remote").

### Technical Integration Terms

#### Email Provider Interface
A standard interface that all email provider integrations must implement for job alert subscriptions.

#### Schema Component
A React component responsible for generating structured data markup for a specific entity type (job, website, etc.).

#### OG Image Generation
The process of creating dynamic Open Graph images for job listings and other content.

#### Configuration Type
TypeScript type definitions that ensure configuration values are valid and properly structured. 