import React, { useState } from 'react';

const PoliciesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-light text-gray-900 dark:text-white mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          Legal Information
        </h1>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mb-8 w-fit">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'privacy' 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'terms' 
                ? 'bg-white text-black' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Terms of Use
          </button>
        </div>

        {activeTab === 'privacy' ? (
          <div className="text-gray-700 dark:text-gray-300 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Privacy Policy</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: <b>July 2025</b></p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">1. Information We Collect</h3>
              <ol className="list-[lower-roman] list-inside space-y-6 mb-8">
                <li>
                  <strong>Files and Content</strong>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>All files, folders, text drops, and notes you upload.</li>
                    <li>We use chunked uploads via Telegram’s Bot API to store files; metadata is retained in our PostgreSQL database (via Supabase).</li>
                  </ul>
                </li>
                <li>
                  <strong>Account & Profile Data</strong>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>If you register, we collect email, user ID, and optional profile name.</li>
                    <li>Authentication is handled by Supabase (row-level encrypted).</li>
                  </ul>
                </li>
                <li>
                  <strong>Usage & Performance Analytics</strong>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Anonymous metrics (e.g. API response times, error rates) to improve service quality.</li>
                    <li>We do not collect any personally identifying analytics (no clickstream tied to email).</li>
                  </ul>
                </li>
                <li>
                  <strong>Technical & Security Data</strong>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>IP addresses, browser user-agent, device type, and timezone—for rate-limiting, fraud prevention, and debugging.</li>
                    <li>Stored temporarily (30 days) and then purged, except where required for abuse investigations.</li>
                  </ul>
                </li>
              </ol>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">2. How We Use Your Information</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li><b>File Storage & Retrieval:</b> to upload/download files via Telegram.</li>
                <li><b>User Experience:</b> to display your “My Drops” list, filenames, notes, and folder structure.</li>
                <li><b>Security & Abuse Prevention:</b> rate‑limiting, detecting malicious activity, and complying with abuse flags.</li>
                <li><b>Service Improvement:</b> aggregated, anonymized usage data.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">3. Data Storage & Security</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li><b>End‑to‑End Encryption:</b> all file chunks are sent from our server to Telegram over HTTPS.</li>
                <li><b>At‑Rest Encryption:</b> Telegram and Supabase store data encrypted using AES‑256.</li>
                <li><b>Access Controls:</b> only your user ID or shareable slug can access your files.</li>
                <li><b>Retention:</b>
                  <ul className="list-disc ml-6 mt-2 space-y-2">
                    <li><b>Files:</b> stored indefinitely unless you delete or set an expiry.</li>
                    <li><b>Logs:</b> technical logs kept up to 30 days, then auto‑deleted.</li>
                  </ul>
                </li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">4. Data Sharing</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li><b>Third‑Party Services:</b>
                  <ul className="list-disc ml-6 mt-2 space-y-2">
                    <li>Telegram Bot API for file storage & delivery.</li>
                    <li>Supabase for user profiles & “My Drops” metadata.</li>
                  </ul>
                </li>
                <li>We do <b>not</b> share, sell, or trade your personal data with advertisers or other third parties.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">5. Data Retention & Deletion</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li>You may delete any file or entire account at any time; upon deletion we:
                  <ul className="list-disc ml-6 mt-2 space-y-2">
                    <li>Remove database records (files, file_chunks, user_files).</li>
                    <li>Issue Telegram API delete requests for any orphaned bot‑sent messages.</li>
                  </ul>
                </li>
                <li>We retain anonymized usage statistics for up to 12 months.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">6. Your Rights</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li><b>Access:</b> request a copy of the personal data we hold.</li>
                <li><b>Rectification:</b> correct or update inaccurate data.</li>
                <li><b>Deletion:</b> erase your personal data (“right to be forgotten”).</li>
                <li><b>Portability:</b> receive your data in a machine‑readable format.</li>
                <li><b>Restriction:</b> ask us to limit processing while a dispute is resolved.</li>
                <li><b>Objection:</b> object to certain uses (e.g. analytics).</li>
              </ul>
              <p className="mb-8">To exercise these rights, contact us via email <a href="mailto:lakshnahar.forwork@gmail.com" className="underline">lakshnahar.forwork@gmail.com</a>.</p>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">7. Children’s Privacy</h3>
              <p className="mb-8">VoidBox is not directed at children under 16. We do not knowingly collect data from minors; if you believe a minor has an account, please contact us to have their data removed.</p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">8. International Data Transfers</h3>
              <p className="mb-8">Our servers run in the EU and US. When you upload/download, data may be routed globally via Telegram’s CDN. We rely on standard contractual clauses and Telegram’s compliance with GDPR.</p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">9. Changes to This Policy</h3>
              <p className="mb-8">We may update this Privacy Policy to reflect changes in technology or law. When we do, we will post the new date at the top and notify you via in‑app banner.</p>
            </section>
          </div>
        ) : (
          <div className="text-gray-700 dark:text-gray-300 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Terms of Use</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: <b>July 2025</b></p>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">1. Acceptance of Terms</h3>
              <p className="mb-8">Use of <b>VoidBox</b> constitutes acceptance of these Terms and our Privacy Policy. If you do not agree, do not use the Service.</p>
              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">2. User Accounts</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li>You may sign up using an email via Supabase.</li>
                <li>You are responsible for maintaining confidentiality of your account credentials.</li>
                <li>Notify us immediately of any unauthorized use.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">3. File Upload & Storage</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li><b>File size:</b> up to 2 GB per file, split into 19 MB chunks under the hood.</li>
                <li><b>Storage:</b> files stored via Telegram; metadata in PostgreSQL (Supabase).</li>
                <li><b>Expiry:</b> you may set a deletion date or max downloads; otherwise files remain until you delete.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">4. Acceptable Use Policy</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li>Upload or distribute illegal, infringing, harmful, or obscene content.</li>
                <li>Transmit malware, viruses, or any code intended to disrupt or damage.</li>
                <li>Harass, defame, or threaten any person or group.</li>
                <li>Attempt to reverse‑engineer our code or bypass API limits.</li>
                <li>Impersonate any person or entity.</li>
              </ul>
              <p className="mb-8 italic">Violation of these rules may result in immediate suspension and deletion of your data.</p>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">5. Rate Limits & Abuse Prevention</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li><b>API limits:</b> 30 requests per minute per IP/bot.</li>
                <li><b>Chunked Uploads:</b> limited by Telegram’s 50 MB/min download cap; we automatically throttle.</li>
                <li>Excessive use may trigger temporary blocks or require multiple bots as fallbacks.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">6. Third‑Party Services</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li>Telegram Bot API for file storage.</li>
                <li>Supabase for user management.</li>
                <li>You must comply with their respective terms (e.g. Telegram’s Terms of Service).</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">7. Intellectual Property</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li>VoidBox and its logos are our trademarks.</li>
                <li>You retain ownership of files you upload; you grant us a license to store and serve them to you.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">8. Disclaimers & Limitation of Liability</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li><b>No Warranty:</b> Service provided “as is” without warranty of any kind.</li>
                <li><b>Limitation:</b> VoidBox and its affiliates are not liable for indirect, incidental, or consequential damages, including data loss or downtime, up to the amount you’ve paid (if any).</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">9. Indemnification</h3>
              <p className="mb-8">You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your violation of these Terms.</p>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">10. Termination</h3>
              <ul className="list-disc list-inside space-y-4 mb-8">
                <li>We may suspend or terminate your account for breach of these Terms or our Acceptable Use Policy, without notice.</li>
                <li>You may delete your own account at any time from your settings page.</li>
              </ul>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">11. Governing Law & Dispute Resolution</h3>
              <p className="mb-8">These Terms are governed by the laws of the EU (Ireland). Any dispute shall be resolved in Dublin courts, unless otherwise required by local law.</p>

              <hr className="my-8 border-gray-300 dark:border-gray-700" />

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">12. Changes to These Terms</h3>
              <p className="mb-8">We may update these Terms at any time. Continued use of VoidBox after changes constitutes acceptance of the new Terms. We will notify you in‑app upon major updates.</p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">Contact</h3>
              <p className="mb-8">Questions? Reach out via email <a href="mailto:lakshnahar.forwork@gmail.com" className="underline">lakshnahar.forwork@gmail.com</a></p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliciesPage;