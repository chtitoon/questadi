import Foundation

struct ContactSuggestion: Identifiable, Hashable {
    let id: UUID
    let resolvedName: String
    let avatarInitials: String
    let phone: String?
    let accountId: String?
    let lastQuotedAt: Date?

    func toEphemeralAccount() -> Account {
        Account(
            id: accountId ?? id.uuidString,
            displayName: resolvedName,
            fullName: nil,
            phone: phone,
            contactId: nil,
            avatarInitials: avatarInitials,
            registered: false,
            createdAt: Date(),
            lastActive: nil,
            createdBy: nil
        )
    }
}

extension AutocompleteResult {
    func toSuggestion() -> ContactSuggestion {
        ContactSuggestion(
            id: UUID(uuidString: id) ?? UUID(),
            resolvedName: fullName ?? displayName,
            avatarInitials: avatarInitials,
            phone: phone ?? nil,
            accountId: id,
            lastQuotedAt: lastQuotedAt
        )
    }
}
