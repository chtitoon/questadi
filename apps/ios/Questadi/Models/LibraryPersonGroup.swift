import Foundation

// App-domain type for SwiftUI (Identifiable).
// Mapped from the generated Components.Schemas.LibraryPersonGroup.
struct LibraryPersonGroupView: Identifiable {
    var id: String { person.id }
    let person: Account
    var quotes: [Quote]
    let lastQuotedAt: Date
}

extension LibraryPersonGroup {
    func toViewGroup() -> LibraryPersonGroupView {
        LibraryPersonGroupView(person: person, quotes: quotes, lastQuotedAt: lastQuotedAt)
    }
}
