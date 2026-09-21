import AppIntents

/// Declares the Siri phrases that map to AddReminderIntent so it shows up
/// in Spotlight/Shortcuts search and works with "Hey Siri" without the user
/// building a Shortcut manually.
@available(iOS 16.0, *)
struct RudeRemindersShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddReminderIntent(),
            phrases: [
                "Add a reminder in \(.applicationName)",
                "Create a reminder in \(.applicationName)",
                "Remind me with \(.applicationName)",
                "\(.applicationName) remind me"
            ],
            shortTitle: "Add Reminder",
            systemImageName: "bell.badge"
        )
    }
}
