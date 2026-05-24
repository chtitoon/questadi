import Foundation
import Contacts

final class ContactsService {
    private var permissionGranted = false

    func requestPermission() async -> Bool {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        if status == .authorized { permissionGranted = true; return true }
        if status == .denied || status == .restricted { return false }
        return await withCheckedContinuation { cont in
            CNContactStore().requestAccess(for: .contacts) { granted, _ in
                self.permissionGranted = granted
                cont.resume(returning: granted)
            }
        }
    }

    func search(query: String) async -> [ContactSuggestion] {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        guard status == .authorized else { return [] }
        let keys: [CNKeyDescriptor] = [
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactIdentifierKey as CNKeyDescriptor,
        ]
        do {
            let contacts = try CNContactStore().unifiedContacts(
                matching: CNContact.predicateForContacts(matchingName: query),
                keysToFetch: keys
            )
            return contacts.map { contact in
                let name = "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
                let rawPhone = contact.phoneNumbers.first?.value.stringValue
                let phone = rawPhone.flatMap { normalizeE164($0) }
                return ContactSuggestion(
                    id: UUID(),
                    resolvedName: name.isEmpty ? contact.givenName : name,
                    avatarInitials: initials(for: name.isEmpty ? contact.givenName : name),
                    phone: phone,
                    accountId: nil,
                    lastQuotedAt: nil
                )
            }
        } catch {
            return []
        }
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ").map(String.init).filter { !$0.isEmpty }
        guard !parts.isEmpty else { return "?" }
        if parts.count == 1 { return String(parts[0].prefix(1)).uppercased() }
        return (String(parts[0].prefix(1)) + String(parts[parts.count - 1].prefix(1))).uppercased()
    }

    private func normalizeE164(_ raw: String) -> String? {
        let digits = raw.filter { $0.isNumber }
        guard digits.count >= 7 else { return nil }
        // Minimal normalization: if starts with country code already, keep it
        if raw.hasPrefix("+") { return "+" + digits }
        return nil
    }
}
