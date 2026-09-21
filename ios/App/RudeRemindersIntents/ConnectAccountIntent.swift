import AppIntents

/// Run once (from the "Connect Rude Reminders" step in Settings > Siri &
/// Shortcuts) to save the access token this extension needs for every later
/// AddReminderIntent call. Not exposed as a Siri phrase on purpose — it's a
/// setup step, not something you'd want to say by accident.
@available(iOS 16.0, *)
struct ConnectAccountIntent: AppIntent {
    static var title: LocalizedStringResource = "Connect Rude Reminders"
    static var description = IntentDescription(
        "Saves your Rude Reminders access token so Siri can create reminders for you without opening the app."
    )

    @Parameter(title: "Access Token")
    var accessToken: String

    static var parameterSummary: some ParameterSummary {
        Summary("Connect Rude Reminders with \(\.$accessToken)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let trimmed = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return .result(dialog: "That token looks empty. Copy it again from Settings, Siri and Shortcuts in the app.")
        }
        AccessToken.save(trimmed)
        return .result(dialog: "Rude Reminders is connected. Try saying, Hey Siri, add a reminder in Rude Reminders.")
    }
}
