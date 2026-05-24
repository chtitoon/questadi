import Foundation

struct AttributedToInput: Encodable {
    let existingId: String?
    let phone: String?
    let displayName: String?

    enum CodingKeys: String, CodingKey {
        case existingId, phone, displayName
    }
}

struct CreateQuoteRequest: Encodable {
    let text: String
    let attributedTo: AttributedToInput?

    enum CodingKeys: String, CodingKey {
        case text, attributedTo
    }
}

struct AttributionPatchRequest: Encodable {
    let attributedTo: AttributedToInput

    enum CodingKeys: String, CodingKey {
        case attributedTo
    }
}

final class QuoteAPIService {
    private let client = NetworkClient.shared

    func createQuote(_ request: CreateQuoteRequest) async throws -> Quote {
        let endpoint = try Endpoint.post("/quotes", body: request)
        return try await client.request(endpoint)
    }

    func getLibrary() async throws -> LibraryResponse {
        return try await client.request(.get("/quotes/library"))
    }

    func updateAttribution(id: String, attributedTo: AttributedToInput) async throws -> Quote {
        let body = AttributionPatchRequest(attributedTo: attributedTo)
        let endpoint = try Endpoint.patch("/quotes/\(id)/attribution", body: body)
        return try await client.request(endpoint)
    }

    func deleteQuote(_ id: String) async throws {
        try await client.requestVoid(.delete("/quotes/\(id)"))
    }

    func restoreQuote(_ id: String) async throws -> Quote {
        let endpoint = try Endpoint.patch("/quotes/\(id)/restore", body: EmptyBody())
        return try await client.request(endpoint)
    }
}

private struct EmptyBody: Encodable {}
