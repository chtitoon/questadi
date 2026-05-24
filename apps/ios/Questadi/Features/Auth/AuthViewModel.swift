import Foundation

enum AuthStep { case phone, code, done }

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var step: AuthStep = .phone
    @Published var phone: String = ""
    @Published var code: String = ""
    @Published var isLoading = false
    @Published var errorMessage: String? = nil

    private let authService = AuthAPIService()

    func requestOTP() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }
        do {
            try await authService.requestOTP(phone: normalizedPhone)
            step = .code
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func verifyOTP() async {
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }
        do {
            let response = try await authService.verifyOTP(phone: normalizedPhone, code: code)
            KeychainService.store(response.token)
            step = .done
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    private var normalizedPhone: String {
        // Preserve "+" prefix; strip all non-digit characters except leading "+"
        let stripped = phone.filter { $0.isNumber || $0 == "+" }
        return stripped.hasPrefix("+") ? stripped : phone
    }
}
