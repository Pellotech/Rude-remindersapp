import { useLocation } from "wouter";

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delete Your Account</h1>
          <p className="text-gray-500">Rude Reminders — Account Deletion</p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How to Delete Your Account</h2>
            <div className="bg-gray-50 rounded-lg p-5 space-y-3">
              <p className="text-gray-700"><strong>Option 1 — In the App:</strong></p>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 ml-2">
                <li>Open Rude Reminders</li>
                <li>Go to <strong>Settings</strong></li>
                <li>Tap <strong>Personal Information</strong></li>
                <li>Tap <strong>Account Management</strong></li>
                <li>Tap <strong>Delete Account</strong></li>
                <li>Confirm the deletion</li>
              </ol>
              <p className="text-gray-700 mt-4"><strong>Option 2 — By Email:</strong></p>
              <p className="text-gray-600 ml-2">
                Send an email to{" "}
                <a href="mailto:ruderemindersinfo@gmail.com" className="text-blue-600 underline">
                  ruderemindersinfo@gmail.com
                </a>{" "}
                from the email address associated with your account. Include "Delete My Account" in the subject line.
                We will process your request within 30 days.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What Data Is Deleted</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>Your account profile (name, email, profile image)</li>
              <li>All reminders you have created</li>
              <li>Personalization preferences (rudeness level, voice character, gender, cultural background)</li>
              <li>Notification settings</li>
              <li>Subscription linkage and billing association</li>
              <li>Authentication tokens and session data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What Data Is Retained</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
              <li>Anonymized usage analytics (not linked to your identity)</li>
              <li>Transaction records required by law or payment processors (e.g., Apple, Google) for up to 180 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Retention Period</h2>
            <p className="text-gray-600 ml-2">
              When you delete your account, all personal data is permanently removed from our servers within <strong>30 days</strong>. 
              During this period, your account is immediately deactivated and inaccessible. After 30 days, all data is 
              irreversibly deleted and cannot be recovered.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Subscription Note</h2>
            <p className="text-gray-600 ml-2">
              Deleting your account does not automatically cancel active subscriptions managed through the App Store or 
              Google Play. Please cancel your subscription through your device's subscription settings before deleting 
              your account to avoid future charges.
            </p>
          </section>

          <div className="border-t pt-6 mt-8 text-center text-sm text-gray-400">
            <p>Questions? Contact us at{" "}
              <a href="mailto:ruderemindersinfo@gmail.com" className="text-blue-500 underline">
                ruderemindersinfo@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
