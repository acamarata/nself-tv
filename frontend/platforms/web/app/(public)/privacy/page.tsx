import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - nself-tv',
  description: 'Privacy policy for nself-tv media platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="privacy-policy">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: February 15, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            nself-tv is a self-hosted, open-source media platform. Your privacy is
            paramount. This policy explains what data we collect, how we use it, and
            your rights under GDPR, CCPA, and other privacy regulations.
          </p>
          <p>
            <strong>Key principle:</strong> Because nself-tv is self-hosted, YOU control
            all data. We (the nself-tv project) do not have access to your instance or
            your data.
          </p>
        </section>

        <section>
          <h2>2. Data Controller</h2>
          <p>
            When you self-host nself-tv, <strong>you are the data controller</strong> for
            all personal data stored in your instance. The nself-tv project provides the
            software; you control how it&apos;s used.
          </p>
          <p>
            If you&apos;re accessing a publicly hosted instance (like family.nself.org),
            the instance administrator is the data controller. Contact them for data
            requests.
          </p>
        </section>

        <section>
          <h2>3. Data We Collect</h2>

          <h3>3.1 Account Data</h3>
          <ul>
            <li>Email address (for authentication)</li>
            <li>Display name and avatar (optional)</li>
            <li>Password (hashed with bcrypt, never stored in plaintext)</li>
            <li>Profile preferences (language, subtitle settings, parental controls)</li>
          </ul>

          <h3>3.2 Usage Data</h3>
          <ul>
            <li>Watch history (titles watched, timestamps, progress)</li>
            <li>Watchlist and favorites</li>
            <li>Ratings and reviews you submit</li>
            <li>Search queries</li>
            <li>Device information (browser, OS, screen resolution for adaptive streaming)</li>
            <li>Playback statistics (bandwidth, buffering events for quality optimization)</li>
          </ul>

          <h3>3.3 Downloaded Content</h3>
          <ul>
            <li>Offline downloads (stored locally in your browser cache)</li>
            <li>Download preferences and queue</li>
          </ul>

          <h3>3.4 Social Features</h3>
          <ul>
            <li>Watch party participation (host/guest status, chat messages)</li>
            <li>Shared content links</li>
          </ul>

          <h3>3.5 Technical Data</h3>
          <ul>
            <li>IP address (logged for security purposes, 30-day retention)</li>
            <li>Session tokens (stored in secure httpOnly cookies)</li>
            <li>Error logs (anonymized, 7-day retention)</li>
          </ul>
        </section>

        <section>
          <h2>4. How We Use Your Data</h2>

          <h3>4.1 Core Functionality</h3>
          <ul>
            <li>Authenticate your account and maintain login sessions</li>
            <li>Resume playback where you left off across devices</li>
            <li>Provide personalized recommendations based on viewing history</li>
            <li>Sync watchlist and favorites across devices</li>
          </ul>

          <h3>4.2 Service Improvement</h3>
          <ul>
            <li>Optimize streaming quality based on network conditions</li>
            <li>Detect and fix playback errors</li>
            <li>Improve content discovery and search relevance</li>
          </ul>

          <h3>4.3 Security</h3>
          <ul>
            <li>Detect and prevent unauthorized access</li>
            <li>Monitor for abuse (rate limiting, DDoS protection)</li>
            <li>Comply with legal obligations (DMCA takedown notices, etc.)</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Sharing</h2>
          <p>
            <strong>We do not sell your data. Ever.</strong>
          </p>

          <h3>5.1 Third-Party Services</h3>
          <p>nself-tv may integrate with external services:</p>
          <ul>
            <li>
              <strong>The Movie Database (TMDB):</strong> Metadata and artwork. We send
              search queries (no personal data). Privacy policy:{' '}
              <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer">
                themoviedb.org/privacy-policy
              </a>
            </li>
            <li>
              <strong>OpenSubtitles:</strong> Subtitle downloads. We send content hash (no
              personal data). Privacy policy:{' '}
              <a href="https://www.opensubtitles.com/privacy" target="_blank" rel="noopener noreferrer">
                opensubtitles.com/privacy
              </a>
            </li>
            <li>
              <strong>Streaming providers:</strong> If you enable direct streaming
              integrations (Netflix, etc.), those services have their own privacy policies.
            </li>
          </ul>

          <h3>5.2 Legal Requirements</h3>
          <p>
            We may disclose data if required by law (subpoena, court order, etc.) or to
            protect rights, safety, or property.
          </p>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <ul>
            <li>
              <strong>Account data:</strong> Retained until account deletion
            </li>
            <li>
              <strong>Watch history:</strong> Retained until manually cleared or account
              deletion
            </li>
            <li>
              <strong>Logs:</strong> Security logs 30 days, error logs 7 days
            </li>
            <li>
              <strong>Deleted accounts:</strong> Data purged within 30 days
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Your Rights (GDPR, CCPA, etc.)</h2>

          <h3>7.1 Access</h3>
          <p>
            Request a copy of all personal data we hold. Go to Settings → Privacy →
            Download My Data.
          </p>

          <h3>7.2 Rectification</h3>
          <p>
            Update your profile, email, and preferences anytime in Settings → Profile.
          </p>

          <h3>7.3 Erasure (&quot;Right to be Forgotten&quot;)</h3>
          <p>
            Delete your account and all associated data. Go to Settings → Privacy →
            Delete Account. This action is irreversible.
          </p>

          <h3>7.4 Portability</h3>
          <p>
            Export your data in JSON format. Go to Settings → Privacy → Download My Data.
          </p>

          <h3>7.5 Objection</h3>
          <p>
            Object to processing (e.g., turn off personalized recommendations). Go to
            Settings → Recommendations → Disable Personalization.
          </p>

          <h3>7.6 Restriction</h3>
          <p>
            Request temporary restriction of processing. Contact the instance administrator.
          </p>
        </section>

        <section>
          <h2>8. Cookies and Local Storage</h2>

          <h3>8.1 Essential Cookies</h3>
          <ul>
            <li>
              <strong>Session token:</strong> httpOnly, secure, SameSite=Strict (7 day expiry)
            </li>
            <li>
              <strong>CSRF token:</strong> Protects against cross-site request forgery
            </li>
          </ul>

          <h3>8.2 Functional Storage</h3>
          <ul>
            <li>
              <strong>Playback state:</strong> Resume position, volume, subtitle preferences
            </li>
            <li>
              <strong>Download cache:</strong> Offline content (managed by service worker)
            </li>
            <li>
              <strong>UI preferences:</strong> Theme, language, layout
            </li>
          </ul>

          <h3>8.3 Analytics (Optional)</h3>
          <p>
            Self-hosted instances may optionally enable privacy-respecting analytics
            (Plausible, Umami, etc.). Check with your instance administrator.
          </p>
        </section>

        <section>
          <h2>9. Security Measures</h2>
          <ul>
            <li>All passwords hashed with bcrypt (cost factor 12)</li>
            <li>HTTPS enforced (TLS 1.3)</li>
            <li>Content Security Policy (CSP) headers</li>
            <li>Rate limiting and DDoS protection</li>
            <li>Regular security audits and dependency scanning</li>
            <li>Optional MFA (TOTP, WebAuthn)</li>
          </ul>
        </section>

        <section>
          <h2>10. Children&apos;s Privacy</h2>
          <p>
            nself-tv is not directed at children under 13. We do not knowingly collect
            data from children. Parental controls are available to restrict access.
          </p>
          <p>
            If you believe a child has created an account, contact the instance
            administrator for immediate deletion.
          </p>
        </section>

        <section>
          <h2>11. International Data Transfers</h2>
          <p>
            Because nself-tv is self-hosted, data stays on YOUR server in YOUR jurisdiction.
            No international transfers unless you choose to host in a different country.
          </p>
          <p>
            For publicly hosted instances, check the instance location and data residency
            policy.
          </p>
        </section>

        <section>
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this policy. Changes will be posted with a new &quot;Last Updated&quot;
            date. Continued use after changes constitutes acceptance.
          </p>
          <p>
            For self-hosted instances, you control the privacy policy. Customize this
            template to match your deployment.
          </p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>
            <strong>For self-hosted instances:</strong> Contact your instance administrator
          </p>
          <p>
            <strong>For the nself-tv project:</strong>{' '}
            <a href="mailto:privacy@nself.org">privacy@nself.org</a>
          </p>
          <p>
            <strong>For family.nself.org demo:</strong>{' '}
            <a href="mailto:privacy@nself.org">privacy@nself.org</a>
          </p>
        </section>

        <section>
          <h2>14. Open Source</h2>
          <p>
            nself-tv is open source. You can audit the code:{' '}
            <a href="https://github.com/acamarata/nself-tv" target="_blank" rel="noopener noreferrer">
              github.com/acamarata/nself-tv
            </a>
          </p>
          <p>
            Transparency is our commitment to your privacy.
          </p>
        </section>
      </div>

      <style jsx>{`
        .privacy-policy {
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

        ul {
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
