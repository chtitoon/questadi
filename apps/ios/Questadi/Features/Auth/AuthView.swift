import SwiftUI

struct AuthView: View {
    @StateObject private var viewModel = AuthViewModel()
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: BrandSpacing.s3) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 36)
                    .padding(.bottom, BrandSpacing.s2)
                Text("Capture what people say.")
                    .font(brandFont(16))
                    .foregroundColor(BrandColor.Neutral._500)
            }

            Spacer()

            VStack(spacing: BrandSpacing.s4) {
                switch viewModel.step {
                case .phone: phoneStep
                case .code:  codeStep
                case .done:  Color.clear.onAppear { appState.isAuthenticated = true }
                }
            }
            .padding(.bottom, BrandSpacing.s12)
        }
        .padding(.horizontal, BrandSpacing.s6)
    }

    private var phoneStep: some View {
        VStack(spacing: BrandSpacing.s3) {
            fieldLabel("Phone number")
            TextField("+1 555 000 0000", text: $viewModel.phone)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
                .font(brandFont(16))
                .brandInput()
            errorText(viewModel.errorMessage)
            brandButton("Send Code", loading: viewModel.isLoading) {
                Task { await viewModel.requestOTP() }
            }
            .disabled(viewModel.phone.isEmpty || viewModel.isLoading)
        }
    }

    private var codeStep: some View {
        VStack(spacing: BrandSpacing.s3) {
            fieldLabel("6-digit code")
            TextField("000000", text: $viewModel.code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .font(brandFont(22).monospacedDigit())
                .multilineTextAlignment(.center)
                .brandInput()
            errorText(viewModel.errorMessage)
            brandButton("Verify", loading: viewModel.isLoading) {
                Task { await viewModel.verifyOTP() }
            }
            .disabled(viewModel.code.count != 6 || viewModel.isLoading)
            Button("Use a different number") { viewModel.step = .phone }
                .font(brandFont(14))
                .foregroundColor(BrandColor.Neutral._500)
                .padding(.top, BrandSpacing.s1)
        }
    }

    @ViewBuilder
    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(brandFont(13, weight: .semibold))
            .foregroundColor(BrandColor.Neutral._500)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func errorText(_ msg: String?) -> some View {
        if let msg {
            Text(msg)
                .font(brandFont(13))
                .foregroundColor(BrandColor.Semantic.error)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private func brandButton(_ label: String, loading: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Group {
                if loading { ProgressView().tint(.white) }
                else { Text(label).font(brandFont(16, weight: .semibold)) }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, BrandSpacing.s4)
            .background(Color.brand)
            .foregroundColor(.white)
            .cornerRadius(BrandRadius.md)
        }
    }
}

private extension View {
    func brandInput() -> some View {
        self
            .padding(BrandSpacing.s4)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(BrandRadius.md)
    }
}
