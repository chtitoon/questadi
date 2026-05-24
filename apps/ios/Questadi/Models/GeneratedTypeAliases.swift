// Aliases so the rest of the app doesn't need to know about OpenAPI namespacing.
// Generated types live in Components.Schemas — see packages/api/openapi.yaml.

import Foundation

typealias Account            = Components.Schemas.Account
typealias Quote              = Components.Schemas.Quote
typealias AutocompleteResult = Components.Schemas.AutocompleteResult
typealias LibraryResponse    = Components.Schemas.LibraryResponse
typealias LibraryPersonGroup = Components.Schemas.LibraryPersonGroup

// Convenience extensions on generated types
extension Components.Schemas.Account {
    var resolvedName: String { fullName ?? displayName }
}

// Identifiable conformances for SwiftUI ForEach
extension Components.Schemas.Quote: Identifiable {}
