import { useLocation } from "wouter";
import { CheckCircle } from "lucide-react";

export default function DeleteAccountComplete() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto">
        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
          <div className="bg-[#1C1C1E] rounded-2xl p-8 w-full text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>

            <h1 className="text-[24px] font-bold text-white">Account Deleted Successfully</h1>

            <div className="space-y-3">
              <p className="text-[15px] text-gray-300">You are now signed out.</p>
              <p className="text-[15px] text-gray-400">
                You can no longer log in with this email. All personal data will be permanently removed within 30 days.
              </p>
            </div>

            <div className="bg-[#2C2C2E] rounded-xl p-4 text-left space-y-2">
              <p className="text-[13px] text-[#8E8E93] uppercase tracking-wide">What was deleted</p>
              <ul className="text-[14px] text-gray-400 space-y-1">
                <li>• Account profile and credentials</li>
                <li>• All reminders</li>
                <li>• Personalization preferences</li>
                <li>• Authentication tokens and sessions</li>
              </ul>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4">
              <p className="text-[14px] text-yellow-400">
                If you had an active subscription through the App Store or Google Play, please cancel it in your device settings to avoid future charges.
              </p>
            </div>

            <button
              onClick={() => {
                window.location.href = "/login";
              }}
              className="w-full py-3.5 bg-[#0A84FF] text-white font-semibold text-[17px] rounded-xl"
            >
              Return to Login
            </button>
          </div>

          <div className="text-center text-[13px] text-gray-500 mt-6">
            <p>Questions? Contact{" "}
              <a href="mailto:ruderemindersinfo@gmail.com" className="text-[#0A84FF] underline">
                ruderemindersinfo@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
