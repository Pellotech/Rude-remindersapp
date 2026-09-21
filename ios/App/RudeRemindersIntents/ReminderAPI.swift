import Foundation

/// Thin client for the one endpoint this extension needs. Talks to the same
/// production API the main app uses (see PRODUCTION_API_URL in
/// client/src/lib/queryClient.ts) — bypasses the app/WebView entirely, which
/// is what makes "Hey Siri, add a reminder..." fast even if the app isn't
/// running.
enum ReminderAPI {
    private static let baseURL = URL(string: "https://rude-reminders.replit.app")!

    enum APIError: Error {
        case unauthorized
        case server(String)
        case network
    }

    struct ReminderResponse: Decodable {
        let id: String?
        let rudeMessage: String?
    }

    private struct ErrorPayload: Decodable {
        let error: String?
        let message: String?
    }

    /// Mirrors the body server/routes.ts's POST /api/reminders expects:
    /// originalMessage (required — also becomes the reminder's title),
    /// context (optional, freeform), scheduledFor (ISO 8601, must be at
    /// least 5 seconds in the future), rudenessLevel (1-5).
    static func createReminder(
        token: String,
        originalMessage: String,
        context: String?,
        scheduledFor: Date,
        rudenessLevel: Int
    ) async throws -> ReminderResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("/api/reminders"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let formatter = ISO8601DateFormatter()
        var body: [String: Any] = [
            "originalMessage": originalMessage,
            "scheduledFor": formatter.string(from: scheduledFor),
            "rudenessLevel": max(1, min(5, rudenessLevel)),
        ]
        if let context, !context.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            body["context"] = context
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw APIError.network
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.network
        }

        if http.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            let payload = try? JSONDecoder().decode(ErrorPayload.self, from: data)
            let message = payload?.error ?? payload?.message ?? "Something went wrong (\(http.statusCode))."
            throw APIError.server(message)
        }

        return try JSONDecoder().decode(ReminderResponse.self, from: data)
    }
}
