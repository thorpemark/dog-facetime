import SwiftUI

@main
struct MemorialCallApp: App {
    @StateObject private var profileStore = ProfileStore()
    @StateObject private var callViewModel = CallViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(profileStore)
                .environmentObject(callViewModel)
        }
    }
}
