import { LegalDocument } from "@/components/legal/LegalDocument";
import config from "@/config";
import { generateMetadata } from "@/lib/utils/metadata";
export const metadata = generateMetadata({
  title: `Privacy & cookies | ${config.nav.title}`,
  description:
    "Understand how the current policy describes personal information, cookies and your privacy rights. Use the contents to jump to a specific section.",
  path: "/privacy",
});
export const dynamic = "force-static";
const SECTIONS = [
  { id: "introduction", title: "Introduction" },
  { id: "the-data-we-collect", title: "The Data We Collect" },
  { id: "how-we-use-your-data", title: "How We Use Your Data" },
  {
    id: "cookies-and-similar-technologies",
    title: "Cookies and Similar Technologies",
  },
  { id: "your-privacy-rights", title: "Your Privacy Rights" },
  { id: "contact-us", title: "Contact Us" },
];
export default function Page() {
  return (
    <LegalDocument
      kind="privacy"
      title="Privacy & cookies"
      description="Understand how the current policy describes personal information, cookies and your privacy rights. Use the contents to jump to a specific section."
      sections={SECTIONS}
    >
      <section id="introduction">
        <h2>Introduction</h2>
        <p>
          We respect your privacy and are committed to protecting your personal
          data. This privacy policy will inform you about how we look after your
          personal data when you visit our website and tell you about your
          privacy rights and how the law protects you.
        </p>
      </section>
      <section id="the-data-we-collect">
        <h2>The Data We Collect</h2>
        <p>
          When you use our job board, we may collect and process the following
          data:
        </p>
        <ul>
          <li>Basic contact information (name, email)</li>
          <li>Job application data</li>
          <li>Usage data and analytics</li>
          <li>Cookie data</li>
        </ul>
      </section>
      <section id="how-we-use-your-data">
        <h2>How We Use Your Data</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Process job applications</li>
          <li>Send relevant job alerts</li>
          <li>Improve our services</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>
      <section id="cookies-and-similar-technologies">
        <h2>Cookies and Similar Technologies</h2>
        <h3>What Are Cookies</h3>
        <p>
          Cookies are small text files that are placed on your computer or
          mobile device when you visit our website. They are widely used to make
          websites work more efficiently and provide a better user experience.
        </p>

        <h3>Types of Cookies We Use</h3>
        <h4>Essential Cookies</h4>
        <p>
          These cookies are necessary for the website to function properly. They
          enable core functionality such as security, network management, and
          accessibility.
        </p>

        <h4>Analytics Cookies</h4>
        <p>
          These cookies help us understand how visitors interact with our
          website by collecting and reporting information anonymously.
        </p>

        <h4>Preference Cookies</h4>
        <p>
          These cookies remember your settings and choices to provide a more
          personalized experience.
        </p>

        <h4>Authentication Cookies</h4>
        <p>
          These cookies help maintain your logged-in state and secure access to
          your account features.
        </p>

        <h3>Managing Cookies</h3>
        <p>
          Most web browsers allow you to control cookies through their settings.
          You can usually find these settings in the &ldquo;options&rdquo; or
          &ldquo;preferences&rdquo; menu of your browser. You can choose to:
        </p>
        <ul>
          <li>Accept or decline cookies when you first visit our site</li>
          <li>Delete all cookies after each browsing session</li>
          <li>Set your browser to block cookies</li>
          <li>Browse in private/incognito mode</li>
        </ul>
        <p>
          Please note that blocking cookies may affect the functionality of our
          website.
        </p>
      </section>
      <section id="your-privacy-rights">
        <h2>Your Privacy Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to processing of your data</li>
          <li>Request transfer of your data</li>
          <li>Withdraw consent at any time</li>
        </ul>
      </section>
      <section id="contact-us">
        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data
          practices, please contact us. We&apos;re here to help you understand
          and exercise your privacy rights.
        </p>
      </section>
    </LegalDocument>
  );
}
