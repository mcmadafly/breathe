import SwiftUI

struct ContentView: View {
    @State private var homeURL = AppConfiguration.resolvedHomeURL
    @State private var reloadTrigger = 0

    var body: some View {
        BreatheWebView(url: homeURL, reloadTrigger: reloadTrigger)
            .frame(minWidth: 720, minHeight: 520)
            .toolbar {
                ToolbarItemGroup(placement: .navigation) {
                    Button("Reload", systemImage: "arrow.clockwise") {
                        reloadTrigger += 1
                    }
                    .help("Reload the page")
                    .keyboardShortcut("r", modifiers: .command)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .breatheHomeURLDidChange)) { _ in
                homeURL = AppConfiguration.resolvedHomeURL
            }
    }
}
