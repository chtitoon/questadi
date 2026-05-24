import Foundation
import UIKit
import UserNotifications

enum ChipState: Equatable {
    case idle
    case searching
    case resolved(Account)

    static func == (lhs: ChipState, rhs: ChipState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle), (.searching, .searching): return true
        case (.resolved(let a), .resolved(let b)): return a.id == b.id
        default: return false
        }
    }
}

enum SaveState: Equatable {
    case idle
    case saving
    case saved
    case failed(String)
}

@MainActor
final class CaptureViewModel: ObservableObject {
    @Published var quoteText: String = ""
    @Published var chipState: ChipState = .idle
    @Published var searchQuery: String = ""
    @Published var suggestions: [ContactSuggestion] = []
    @Published var saveState: SaveState = .idle

    private var resolvedServerAccountId: String? = nil
    private var searchTask: Task<Void, Never>? = nil
    private let quoteService = QuoteAPIService()
    private let accountService = AccountAPIService()
    private let contactsService = ContactsService()

    func requestContactsPermissionIfNeeded() {
        Task { await contactsService.requestPermission() }
    }

    func search(query: String) {
        searchTask?.cancel()
        guard !query.isEmpty else { suggestions = []; return }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(200))
            guard !Task.isCancelled else { return }
            async let contactResults = contactsService.search(query: query)
            async let accountResults = (try? await accountService.search(query: query)) ?? []
            let (contacts, accounts) = await (contactResults, accountResults)
            guard !Task.isCancelled else { return }
            suggestions = merge(contacts: contacts, accounts: accounts)
        }
    }

    func selectSuggestion(_ suggestion: ContactSuggestion) {
        resolvedServerAccountId = suggestion.accountId
        chipState = .resolved(suggestion.toEphemeralAccount())
    }

    func addNew(name: String) {
        resolvedServerAccountId = nil
        let initials = deriveInitials(name)
        let account = Account(
            id: UUID().uuidString, displayName: name, fullName: nil,
            phone: nil, contactId: nil, avatarInitials: initials,
            registered: false, createdAt: Date(), lastActive: nil, createdBy: nil
        )
        chipState = .resolved(account)
    }

    func save() async {
        guard saveState != .saving else { return }
        saveState = .saving
        let request = buildRequest()
        do {
            _ = try await quoteService.createQuote(request)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            saveState = .saved
        } catch let error as APIError {
            if case .unauthorized = error {
                NotificationCenter.default.post(name: .questadaRequiresAuth, object: nil)
                saveState = .failed("Session expired. Please sign in again.")
            } else {
                saveState = .failed(error.errorDescription ?? "Save failed")
            }
        } catch {
            saveState = .failed(error.localizedDescription)
        }
    }

    func backgroundApp() {
        let content = UNMutableNotificationContent()
        content.title = "Quote saved"
        content.body = "Tap to open Questadi."
        content.sound = .none
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        let request = UNNotificationRequest(identifier: "quote-saved", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
        UIApplication.shared.perform(#selector(NSXPCConnection.suspend))
    }

    // MARK: - Private

    private func buildRequest() -> CreateQuoteRequest {
        let text = "\"\(quoteText.trimmingCharacters(in: .whitespacesAndNewlines))\""
        var attributed: AttributedToInput? = nil
        if case .resolved(let account) = chipState {
            attributed = AttributedToInput(
                existingId: resolvedServerAccountId ?? (account.registered ? account.id : nil),
                phone: account.phone,
                displayName: account.displayName
            )
        }
        return CreateQuoteRequest(text: text, attributedTo: attributed)
    }

    private func merge(contacts: [ContactSuggestion], accounts: [ContactSuggestion]) -> [ContactSuggestion] {
        var merged: [ContactSuggestion] = accounts
        let accountPhones = Set(accounts.compactMap { $0.phone })
        for contact in contacts where contact.phone == nil || !accountPhones.contains(contact.phone!) {
            merged.append(contact)
        }
        merged.sort {
            if let a = $0.lastQuotedAt, let b = $1.lastQuotedAt { return a > b }
            if $0.lastQuotedAt != nil { return true }
            if $1.lastQuotedAt != nil { return false }
            return $0.resolvedName < $1.resolvedName
        }
        return Array(merged.prefix(4))
    }

    private func deriveInitials(_ name: String) -> String {
        let parts = name.split(separator: " ").map(String.init).filter { !$0.isEmpty }
        guard !parts.isEmpty else { return "?" }
        if parts.count == 1 { return String(parts[0].prefix(1)).uppercased() }
        return (String(parts[0].prefix(1)) + String(parts[parts.count - 1].prefix(1))).uppercased()
    }
}
