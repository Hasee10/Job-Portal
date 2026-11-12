import { LegalDocument } from "@/components/legal/LegalDocument";
import config from "@/config";
import { generateMetadata } from "@/lib/utils/metadata";
export const metadata = generateMetadata({
  title: `Terms of service | ${config.nav.title}`,
  description:
    "Read the current terms governing use of the platform. Browse the sections below or contact us with a question.",
  path: "/terms",
});
export const dynamic = "force-static";
const SECTIONS = [
  { id: "agreement-to-terms", title: "Agreement to Terms" },
  { id: "use-license", title: "Use License" },
  { id: "job-postings", title: "Job Postings" },
  { id: "user-obligations", title: "User Obligations" },
  { id: "disclaimer", title: "Disclaimer" },
  { id: "limitations", title: "Limitations" },
  { id: "revisions-and-errata", title: "Revisions and Errata" },
  { id: "links", title: "Links" },
  { id: "modifications", title: "Modifications" },
  { id: "contact-information", title: "Contact Information" },
];
export default function Page() {
  return (
    <LegalDocument
      kind="terms"
      title="Terms of service"
      description="Read the current terms governing use of the platform. Browse the sections below or contact us with a question."
      sections={SECTIONS}
    >
      <section id="agreement-to-terms">
        <h2>Agreement to Terms</h2>
        <p>
          By accessing or using our job board platform, you agree to be bound by
          these Terms of Service. If you disagree with any part of the terms,
          you may not access the service.
        </p>
      </section>
      <section id="use-license">
        <h2>Use License</h2>
        <p>
          Permission is granted to temporarily access the materials (information
          or software) on our job board platform for personal, non-commercial
          transitory viewing only.
        </p>
        <p>
          This license shall automatically terminate if you violate any of these
          restrictions and may be terminated by us at any time.
        </p>
      </section>
      <section id="job-postings">
        <h2>Job Postings</h2>
        <p>When posting jobs on our platform, you agree to:</p>
        <ul>
          <li>Provide accurate and complete information about the position</li>
          <li>Include clear job requirements and responsibilities</li>
          <li>Specify accurate compensation information</li>
          <li>Maintain and update job postings</li>
          <li>Remove filled positions promptly</li>
          <li>Comply with all applicable employment laws</li>
        </ul>
      </section>
      <section id="user-obligations">
        <h2>User Obligations</h2>
        <p>As a user of our platform, you agree not to:</p>
        <ul>
          <li>Post false, inaccurate, or misleading information</li>
          <li>Violate any laws or regulations</li>
          <li>Infringe upon intellectual property rights</li>
          <li>Distribute malicious code or harmful content</li>
          <li>Attempt to gain unauthorized access to our systems</li>
        </ul>
      </section>
      <section id="disclaimer">
        <h2>Disclaimer</h2>
        <p>
          The materials on our job board platform are provided on an &apos;as
          is&apos; basis. We make no warranties, expressed or implied, and
          hereby disclaim and negate all other warranties including, without
          limitation, implied warranties or conditions of merchantability,
          fitness for a particular purpose, or non-infringement of intellectual
          property or other violation of rights.
        </p>
      </section>
      <section id="limitations">
        <h2>Limitations</h2>
        <p>
          In no event shall we or our suppliers be liable for any damages
          (including, without limitation, damages for loss of data or profit, or
          due to business interruption) arising out of the use or inability to
          use our platform.
        </p>
      </section>
      <section id="revisions-and-errata">
        <h2>Revisions and Errata</h2>
        <p>
          The materials appearing on our platform could include technical,
          typographical, or photographic errors. We do not warrant that any of
          the materials on our platform are accurate, complete, or current. We
          may make changes to the materials at any time without notice.
        </p>
      </section>
      <section id="links">
        <h2>Links</h2>
        <p>
          We have not reviewed all of the sites linked to our platform and are
          not responsible for the contents of any such linked site. The
          inclusion of any link does not imply endorsement by us of the site.
          Use of any such linked website is at the user&apos;s own risk.
        </p>
      </section>
      <section id="modifications">
        <h2>Modifications</h2>
        <p>
          We may revise these terms of service at any time without notice. By
          using our platform, you are agreeing to be bound by the then current
          version of these terms of service.
        </p>
      </section>
      <section id="contact-information">
        <h2>Contact Information</h2>
        <p>
          If you have any questions about these Terms of Service, please contact
          us. We&apos;re here to help you understand your rights and obligations
          under these terms.
        </p>
      </section>
    </LegalDocument>
  );
}
