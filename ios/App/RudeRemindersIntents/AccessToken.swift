import Foundation

/// Stores the Siri/Shortcuts access token (see /api/auth/siri-token on the
/// server) inside THIS EXTENSION's own UserDefaults.standard.
///
/// Important: an App Intents extension runs as its own process with its own
/// app container — it does NOT share UserDefaults.standard with the main
/// Rude Reminders app, so it can't read the token the main app stores via
/// Capacitor Preferences. That's why this is a separate, purpose-built token
/// the user pastes in once via ConnectAccountIntent ("Connect Rude
/// Reminders"). Once saved here, it persists across Siri invocations just
/// like any other UserDefaults value — this extension's container isn't
/// wiped between runs.
enum AccessToken {
    private static let key = "com.goosebumpsmw.rudereminders.siriAccessToken"

    static func load() -> String? {
        UserDefaults.standard.string(forKey: key)
    }

    static func save(_ token: String) {
        UserDefaults.standard.set(token, forKey: key)
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}
