import Foundation
import LocalAuthentication
import React

@objc(BiometricAuthModule)
class BiometricAuthModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    var error: NSError?

    if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
      switch context.biometryType {
      case .faceID:
        resolve("FaceID")
      case .touchID:
        resolve("TouchID")
      case .none:
        resolve("None")
      @unknown default:
        resolve("None")
      }
    } else {
      resolve("None")
    }
  }

  @objc
  func authenticate(_ reason: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    var error: NSError?

    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
      reject("NOT_AVAILABLE", "Biometric authentication not available", error)
      return
    }

    context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
      DispatchQueue.main.async {
        if success {
          resolve(true)
        } else {
          if let error = error as? LAError {
            switch error.code {
            case .userCancel, .userFallback, .systemCancel:
              resolve(false)
            default:
              reject("AUTH_FAILED", "Authentication failed", error)
            }
          } else {
            reject("AUTH_FAILED", "Authentication failed", error)
          }
        }
      }
    }
  }
}
