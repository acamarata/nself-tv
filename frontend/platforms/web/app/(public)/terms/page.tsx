import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - nself-tv',
  description: 'Terms of service for nself-tv media platform',
};

export default function TermsOfServicePage() {
  return (
    <div className="terms-of-service">
      <div className="container">
        <h1>Terms of Service</h1>
        <p className="last-updated">Last updated: February 15, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using nself-tv, you agree to be bound by these Terms of
            Service and all applicable laws and regulations. If you do not agree, do not
            use this service.
          </p>
          <p>
            <strong>Important:</strong> If you are self-hosting nself-tv, these terms
            apply to your instance. You may customize them for your deployment.
          </p>
        </section>

        <section>
          <h2>2. Service Description</h2>
          <p>
            nself-tv is a free, open-source media platform that allows you to:
          </p>
          <ul>
            <li>Organize and stream your personal media library</li>
            <li>Download content for offline viewing</li>
            <li>Discover new content across streaming services</li>
            <li>Share watch parties with friends and family</li>
            <li>Access content across multiple devices and platforms</li>
          </ul>
          <p>
            The software is provided &quot;as is&quot; under the GNU Affero General Public
            License v3.0 (AGPL-3.0).
          </p>
        </section>

        <section>
          <h2>3. User Responsibilities</h2>

          <h3>3.1 Legal Compliance</h3>
          <p>You agree to:</p>
          <ul>
            <li>
              Only upload, stream, or download content you have the legal right to access
            </li>
            <li>Comply with all copyright, trademark, and intellectual property laws</li>
            <li>Respect content licensing restrictions (regional availability, DRM, etc.)</li>
            <li>Not use nself-tv for piracy or unauthorized distribution</li>
          </ul>

          <h3>3.2 Acceptable Use</h3>
          <p>You agree NOT to:</p>
          <ul>
            <li>Attempt to circumvent security measures or access controls</li>
            <li>Reverse engineer, decompile, or disassemble the software (except as permitted by AGPL-3.0)</li>
            <li>Use automated tools to scrape content or overload servers</li>
            <li>Upload malicious code, viruses, or malware</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Impersonate others or misrepresent your identity</li>
          </ul>

          <h3>3.3 Account Security</h3>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your password</li>
            <li>All activities that occur under your account</li>
            <li>Notifying the administrator immediately of unauthorized access</li>
          </ul>
        </section>

        <section>
          <h2>4. Content Rights and Ownership</h2>

          <h3>4.1 Your Content</h3>
          <p>
            You retain all rights to content you upload. By uploading content, you grant
            nself-tv a license to:
          </p>
          <ul>
            <li>Store, transcode, and stream your content</li>
            <li>Generate thumbnails, previews, and metadata</li>
            <li>Enable offline downloads to your devices</li>
          </ul>
          <p>This license is limited to providing the service and ends when you delete content.</p>

          <h3>4.2 Third-Party Content</h3>
          <p>
            Content metadata and artwork from TMDB, OpenSubtitles, and other services
            remain the property of their respective owners. We use this data under their
            terms of service.
          </p>

          <h3>4.3 User-Generated Content</h3>
          <p>
            Reviews, ratings, and watch party chat messages you submit may be visible to
            other users. You grant other users a non-exclusive license to view this
            content within the service.
          </p>
        </section>

        <section>
          <h2>5. DMCA and Copyright</h2>

          <h3>5.1 Copyright Infringement</h3>
          <p>
            nself-tv respects intellectual property rights. If you believe content
            infringes your copyright, submit a DMCA takedown notice to:{' '}
            <a href="mailto:dmca@nself.org">dmca@nself.org</a>
          </p>

          <h3>5.2 Required Information</h3>
          <p>DMCA notices must include:</p>
          <ul>
            <li>Your contact information (name, address, email, phone)</li>
            <li>Description of the copyrighted work</li>
            <li>URL or location of the infringing content</li>
            <li>Statement of good faith belief that use is unauthorized</li>
            <li>Statement that the information is accurate and you are authorized to act</li>
            <li>Your physical or electronic signature</li>
          </ul>

          <h3>5.3 Counter-Notification</h3>
          <p>
            If your content was removed due to a DMCA notice and you believe it was a
            mistake, you may submit a counter-notification.
          </p>

          <h3>5.4 Repeat Infringers</h3>
          <p>
            Accounts with repeated copyright violations will be terminated at the
            administrator&apos;s discretion.
          </p>
        </section>

        <section>
          <h2>6. Service Availability</h2>

          <h3>6.1 Uptime</h3>
          <p>
            We strive for high availability but do not guarantee uninterrupted service.
            Maintenance, updates, and unforeseen outages may occur.
          </p>

          <h3>6.2 Self-Hosted Instances</h3>
          <p>
            For self-hosted deployments, YOU are responsible for uptime, backups, and
            infrastructure. The nself-tv project provides software, not hosting.
          </p>

          <h3>6.3 Content Availability</h3>
          <p>
            Content availability depends on your library, streaming integrations, and
            regional restrictions. We cannot guarantee access to specific titles.
          </p>
        </section>

        <section>
          <h2>7. Modifications and Termination</h2>

          <h3>7.1 Service Changes</h3>
          <p>
            We reserve the right to modify, suspend, or discontinue any feature at any
            time without notice. We will make reasonable efforts to notify users of major
            changes.
          </p>

          <h3>7.2 Terms Updates</h3>
          <p>
            These terms may be updated. Continued use after changes constitutes acceptance.
            Major changes will be announced with at least 30 days notice.
          </p>

          <h3>7.3 Account Termination</h3>
          <p>We may terminate or suspend accounts for:</p>
          <ul>
            <li>Violation of these terms</li>
            <li>Illegal activity</li>
            <li>Security threats</li>
            <li>Prolonged inactivity (self-hosted instances may set their own policy)</li>
          </ul>
          <p>
            You may terminate your account at any time via Settings → Privacy → Delete
            Account.
          </p>
        </section>

        <section>
          <h2>8. Disclaimers</h2>

          <h3>8.1 No Warranty</h3>
          <p>
            nself-tv is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without any
            warranties, express or implied, including but not limited to:
          </p>
          <ul>
            <li>Merchantability</li>
            <li>Fitness for a particular purpose</li>
            <li>Non-infringement</li>
            <li>Accuracy, reliability, or availability</li>
          </ul>

          <h3>8.2 Content Disclaimer</h3>
          <p>
            We do not control, verify, or endorse user-uploaded content. You access
            content at your own risk.
          </p>

          <h3>8.3 Third-Party Services</h3>
          <p>
            Integrations with TMDB, OpenSubtitles, streaming providers, and other services
            are subject to their terms. We are not responsible for third-party service
            availability or changes.
          </p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, nself-tv and its contributors shall
            not be liable for:
          </p>
          <ul>
            <li>Direct, indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or goodwill</li>
            <li>Service interruptions or errors</li>
            <li>Unauthorized access or data breaches (we implement security but cannot guarantee absolute protection)</li>
            <li>Third-party actions or content</li>
          </ul>
          <p>
            <strong>Maximum liability:</strong> In no event shall our total liability
            exceed the amount you paid for the service in the past 12 months (which is
            $0 for free/self-hosted instances).
          </p>
        </section>

        <section>
          <h2>10. Indemnification</h2>
          <p>You agree to indemnify and hold harmless nself-tv, its contributors, and affiliates from:</p>
          <ul>
            <li>Your use of the service</li>
            <li>Your violation of these terms</li>
            <li>Your violation of any rights of third parties</li>
            <li>Content you upload or share</li>
          </ul>
        </section>

        <section>
          <h2>11. Jurisdiction and Disputes</h2>

          <h3>11.1 Governing Law</h3>
          <p>
            These terms are governed by the laws of the jurisdiction where the service is
            hosted:
          </p>
          <ul>
            <li>
              <strong>Self-hosted:</strong> Your local jurisdiction
            </li>
            <li>
              <strong>family.nself.org:</strong> United States (specifically, State of Michigan)
            </li>
          </ul>

          <h3>11.2 Dispute Resolution</h3>
          <p>
            Any disputes shall be resolved through:
          </p>
          <ol>
            <li>Good faith negotiation</li>
            <li>Mediation (if negotiation fails)</li>
            <li>Binding arbitration or small claims court (as applicable)</li>
          </ol>

          <h3>11.3 Class Action Waiver</h3>
          <p>
            You agree to resolve disputes individually, not as part of a class action or
            consolidated proceeding.
          </p>
        </section>

        <section>
          <h2>12. Open Source License</h2>
          <p>
            nself-tv is licensed under the GNU Affero General Public License v3.0
            (AGPL-3.0). Key points:
          </p>
          <ul>
            <li>You may use, modify, and distribute the software</li>
            <li>Modified versions must also be open source (AGPL-3.0)</li>
            <li>If you run a modified version as a service, you must make your source code available</li>
            <li>
              Full license:{' '}
              <a href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank" rel="noopener noreferrer">
                gnu.org/licenses/agpl-3.0
              </a>
            </li>
          </ul>
          <p>
            Source code:{' '}
            <a href="https://github.com/acamarata/nself-tv" target="_blank" rel="noopener noreferrer">
              github.com/acamarata/nself-tv
            </a>
          </p>
        </section>

        <section>
          <h2>13. Accessibility</h2>
          <p>
            We strive to make nself-tv accessible to users with disabilities. Features
            include:
          </p>
          <ul>
            <li>Keyboard navigation</li>
            <li>Screen reader support (ARIA labels)</li>
            <li>Customizable subtitles and closed captions</li>
            <li>Audio descriptions (where available)</li>
            <li>High contrast mode and font size adjustments</li>
          </ul>
          <p>
            If you encounter accessibility issues, please report them to:{' '}
            <a href="mailto:accessibility@nself.org">accessibility@nself.org</a>
          </p>
        </section>

        <section>
          <h2>14. Contact</h2>
          <p>
            Questions about these terms?
          </p>
          <ul>
            <li>
              <strong>Self-hosted instances:</strong> Contact your instance administrator
            </li>
            <li>
              <strong>nself-tv project:</strong>{' '}
              <a href="mailto:legal@nself.org">legal@nself.org</a>
            </li>
            <li>
              <strong>family.nself.org demo:</strong>{' '}
              <a href="mailto:legal@nself.org">legal@nself.org</a>
            </li>
          </ul>
        </section>

        <section>
          <h2>15. Severability</h2>
          <p>
            If any provision of these terms is found to be unenforceable, the remaining
            provisions shall continue in full force and effect.
          </p>
        </section>
      </div>

      <style jsx>{`
        .terms-of-service {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .container {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 2rem;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: #fff;
        }

        .last-updated {
          color: #888;
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }

        section {
          margin-bottom: 2rem;
        }

        h2 {
          font-size: 1.8rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #fff;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 0.5rem;
        }

        h3 {
          font-size: 1.3rem;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #fff;
        }

        p {
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 1rem;
        }

        ul,
        ol {
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 1rem;
          padding-left: 2rem;
        }

        li {
          margin-bottom: 0.5rem;
        }

        a {
          color: #4a9eff;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        strong {
          color: #fff;
        }

        @media (max-width: 768px) {
          .container {
            padding: 1.5rem;
          }

          h1 {
            font-size: 2rem;
          }

          h2 {
            font-size: 1.5rem;
          }

          h3 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
