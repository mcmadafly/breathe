import Foundation

enum AppConfiguration {
    static let userDefaultsHomeURLKey = "breatheHomeURL"

    /// Default matches the production custom domain referenced in the repo README (`spirare.io`).
    static let defaultHomeURL = URL(string: "https://spirare.io/breathe")!

    static var resolvedHomeURL: URL {
        let defaults = UserDefaults.standard
        if let raw = defaults.string(forKey: userDefaultsHomeURLKey) {
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty, let url = URL(string: trimmed) {
                return url
            }
        }
        return defaultHomeURL
    }

    static func setHomeURLString(_ raw: String?) {
        let defaults = UserDefaults.standard
        guard let raw else {
            defaults.removeObject(forKey: userDefaultsHomeURLKey)
            return
        }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            defaults.removeObject(forKey: userDefaultsHomeURLKey)
        } else {
            defaults.set(trimmed, forKey: userDefaultsHomeURLKey)
        }
    }
}
