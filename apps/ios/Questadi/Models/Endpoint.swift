import Foundation

struct Endpoint {
    let method: String
    let path: String
    let body: Data?
    let queryItems: [URLQueryItem]?

    static func get(_ path: String, query: [URLQueryItem]? = nil) -> Endpoint {
        Endpoint(method: "GET", path: path, body: nil, queryItems: query)
    }

    static func post(_ path: String, body: Encodable) throws -> Endpoint {
        let data = try JSONEncoder.api.encode(body)
        return Endpoint(method: "POST", path: path, body: data, queryItems: nil)
    }

    static func patch(_ path: String, body: Encodable) throws -> Endpoint {
        let data = try JSONEncoder.api.encode(body)
        return Endpoint(method: "PATCH", path: path, body: data, queryItems: nil)
    }

    static func delete(_ path: String) -> Endpoint {
        Endpoint(method: "DELETE", path: path, body: nil, queryItems: nil)
    }
}

extension JSONEncoder {
    static let api: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()
}
