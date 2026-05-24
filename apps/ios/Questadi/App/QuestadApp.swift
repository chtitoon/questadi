import SwiftUI

@main
struct QuestadApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .onOpenURL { url in
                    if url.scheme == "questadi" && url.host == "capture" {
                        appState.openCapture = true
                    }
                }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        if appState.isAuthenticated {
            LibraryView()
                .sheet(isPresented: $appState.openCapture) {
                    NavigationStack { CaptureView() }
                }
        } else {
            AuthView()
        }
    }
}
