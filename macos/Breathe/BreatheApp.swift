import SwiftUI

@main
struct BreatheApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .commands {
            CommandGroup(replacing: .newItem) {}
        }

        Settings {
            PreferencesView()
        }
    }
}
