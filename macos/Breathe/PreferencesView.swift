import SwiftUI

struct PreferencesView: View {
    @State private var urlText = ""

    var body: some View {
        Form {
            Section {
                TextField("Home URL", text: $urlText)
                    .textFieldStyle(.roundedBorder)
                    .help("Leave empty or reset to use the default production URL.")
            } header: {
                Text("Open Breathe at this address when the app launches.")
            }

            HStack {
                Button("Save") {
                    let trimmed = urlText.trimmingCharacters(in: .whitespacesAndNewlines)
                    AppConfiguration.setHomeURLString(trimmed.isEmpty ? nil : trimmed)
                    NotificationCenter.default.post(name: .breatheHomeURLDidChange, object: nil)
                }

                Button("Reset to default") {
                    urlText = AppConfiguration.defaultHomeURL.absoluteString
                    AppConfiguration.setHomeURLString(nil)
                    NotificationCenter.default.post(name: .breatheHomeURLDidChange, object: nil)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
        .frame(minWidth: 440)
        .onAppear {
            urlText = UserDefaults.standard.string(forKey: AppConfiguration.userDefaultsHomeURLKey)
                ?? AppConfiguration.defaultHomeURL.absoluteString
        }
    }
}

extension Notification.Name {
    static let breatheHomeURLDidChange = Notification.Name("breatheHomeURLDidChange")
}
