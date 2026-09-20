import AppIntents

/// The actual "Hey Siri, add a reminder..." intent. Siri resolves `when`
/// from natural speech on its own (App Intents' Date parameter type gets
/// this for free — no manual date parsing needed here).
///
/// Requires ConnectAccountIntent to have been run at least once; otherwise
/// this tells the user what to do instead of failing silently.
@available(iOS 16.0, *)
struct AddReminderIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Reminder"
    static var description = IntentDescription("Creates a new rude reminder in Rude Reminders.")

    @Parameter(title: "What to be reminded of")
    var content: String

    @Parameter(title: "When")
    var when: Date

    @Parameter(title: "Extra context", default: nil)
    var context: String?

    @Parameter(title: "Rudeness level (1-5)", default: 3)
    var rudenessLevel: Int

    static var parameterSummary: some ParameterSummary {
        Summary("Remind me to \(\.$content) \(\.$when)") {
            \.$context
            \.$rudenessLevel
        }
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let token = AccessToken.load() else {
            return .result(dialog: """
            You haven't connected Rude Reminders to Siri yet. Open Settings, \
            Siri and Shortcuts in the app, generate an access token, then run \
            Connect Rude Reminders once.
            """)
        }

        do {
            _ = try await ReminderAPI.createReminder(
                token: token,
                originalMessage: content,
                context: context,
                scheduledFor: when,
                rudenessLevel: rudenessLevel
            )
            return .result(dialog: "Done. I'll rudely remind you to \(content).")
        } catch ReminderAPI.APIError.unauthorized {
            AccessToken.clear()
            return .result(dialog: """
            Your Rude Reminders access token isn't valid anymore. Generate a \
            new one in Settings, Siri and Shortcuts, and reconnect.
            """)
        } catch ReminderAPI.APIError.server(let message) {
            return .result(dialog: "Rude Reminders couldn't create that: \(message)")
        } catch {
            return .result(dialog: "Couldn't reach Rude Reminders. Check your connection and try again.")
        }
    }
}
