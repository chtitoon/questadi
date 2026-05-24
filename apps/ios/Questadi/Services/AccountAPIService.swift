import Foundation

final class AccountAPIService {
    private let client = NetworkClient.shared

    func search(query: String, limit: Int = 8) async throws -> [ContactSuggestion] {
        let items = [
            URLQueryItem(name: "q",     value: query),
            URLQueryItem(name: "limit", value: "\(limit)"),
        ]
        let results: [AutocompleteResult] = try await client.request(.get("/user/contacts", query: items))
        return results.map { $0.toSuggestion() }
    }
}
