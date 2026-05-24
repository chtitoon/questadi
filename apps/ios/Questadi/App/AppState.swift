import Foundation
import Combine
import UserNotifications

final class AppState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var openCapture: Bool = false

    init() {
        isAuthenticated = KeychainService.retrieve() != nil
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRequiresAuth),
            name: .questadaRequiresAuth,
            object: nil
        )
    }

    @objc private func handleRequiresAuth() {
        DispatchQueue.main.async {
            self.isAuthenticated = false
        }
    }
}

extension Notification.Name {
    static let questadaRequiresAuth = Notification.Name("questadi.requiresAuth")
}
