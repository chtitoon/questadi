import Foundation

struct OTPRequestBody: Encodable { let phone: String }
struct OTPVerifyBody: Encodable  { let phone: String; let code: String }

struct AuthResponse: Decodable {
    let token: String
    let account: Account
}

final class AuthAPIService {
    private let client = NetworkClient.shared

    func requestOTP(phone: String) async throws {
        let endpoint = try Endpoint.post("/otp/request", body: OTPRequestBody(phone: phone))
        let _: [String: Bool] = try await client.request(endpoint)
    }

    func verifyOTP(phone: String, code: String) async throws -> AuthResponse {
        let endpoint = try Endpoint.post("/otp/verify", body: OTPVerifyBody(phone: phone, code: code))
        return try await client.request(endpoint)
    }
}
