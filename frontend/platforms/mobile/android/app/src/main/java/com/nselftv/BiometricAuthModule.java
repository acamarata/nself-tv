package com.nselftv;

import android.os.Build;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;

public class BiometricAuthModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BiometricAuthModule";
    private final ReactApplicationContext reactContext;

    public BiometricAuthModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void isAvailable(Promise promise) {
        try {
            BiometricManager biometricManager = BiometricManager.from(reactContext);

            int canAuthenticate = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG |
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            );

            switch (canAuthenticate) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    // Determine type
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        promise.resolve("Fingerprint"); // Could be Face, Iris, or Fingerprint
                    } else {
                        promise.resolve("Fingerprint");
                    }
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                default:
                    promise.resolve("None");
                    break;
            }
        } catch (Exception e) {
            promise.resolve("None");
        }
    }

    @ReactMethod
    public void authenticate(String reason, final Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            try {
                FragmentActivity activity = (FragmentActivity) getCurrentActivity();
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "No activity available");
                    return;
                }

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Authentication Required")
                    .setSubtitle(reason)
                    .setNegativeButtonText("Cancel")
                    .build();

                BiometricPrompt biometricPrompt = new BiometricPrompt(
                    activity,
                    ContextCompat.getMainExecutor(reactContext),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            super.onAuthenticationSucceeded(result);
                            promise.resolve(true);
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            super.onAuthenticationFailed();
                            promise.resolve(false);
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            super.onAuthenticationError(errorCode, errString);
                            if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                                errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                                promise.resolve(false);
                            } else {
                                promise.reject("AUTH_ERROR", errString.toString());
                            }
                        }
                    }
                );

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                promise.reject("AUTH_FAILED", "Authentication failed", e);
            }
        });
    }
}
