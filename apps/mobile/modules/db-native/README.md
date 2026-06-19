# db-native

Bridges the mobile app to the `shared-rust` crate (`packages/shared-rust`) via
[UniFFI](https://mozilla.github.io/uniffi-rs/) and the
[Expo Modules API](https://docs.expo.dev/modules/overview/).

- **Android**: fully wired and verified — `cargo-ndk` builds `shared-rust` to a `.so`,
  `uniffi-bindgen` generates a Kotlin binding, and a thin `DbNativeModule.kt` exposes it
  to JS as async functions. `apps/mobile/android` (full app) and `:db-native` (module
  alone) both build successfully with this in place (`./gradlew :app:assembleDebug`).
- **iOS**: Swift binding generated and `DbNativeModule.swift` written, but **not built or
  tested** — there is no Xcode/macOS toolchain on this machine. See "iOS: remaining work"
  below.

None of the generated/compiled artifacts are committed (see root `.gitignore`); regenerate
them with the steps below after a fresh clone or whenever `packages/shared-rust` changes.

## Architecture

```
packages/shared-rust (Rust)
  -> cargo-ndk build --release          -> android/src/main/jniLibs/<abi>/libshared_rust.so
  -> uniffi-bindgen generate --kotlin   -> android/src/main/java/uniffi/shared_rust/shared_rust.kt
  -> uniffi-bindgen generate --swift    -> ios/generated/shared_rust.swift (+ FFI header/modulemap)

android/src/main/java/expo/modules/dbnative/DbNativeModule.kt   (hand-written, wraps the Kotlin binding)
ios/DbNativeModule.swift                                         (hand-written, wraps the Swift binding — not yet built)

index.ts -> requireNativeModule('DbNative') -> connect/disconnect/executeQuery/getSchema
```

`expo-modules-autolinking` discovers this module automatically via
`expo-module.config.json` since it's a local npm workspace package (`apps/mobile/modules/*`).

## One-time toolchain setup

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
cargo install cargo-ndk
```

Requires `ANDROID_NDK_HOME` pointing at an installed NDK (r25+ tested with r27c).

## Regenerating the Android bridge

Run from `packages/shared-rust`:

```bash
# 1. Cross-compile the Rust crate and drop the .so files where Gradle expects them
cargo ndk -t arm64-v8a -t x86_64 -o ../../apps/mobile/modules/db-native/android/src/main/jniLibs build --release

# 2. Generate the Kotlin binding from the compiled library (library mode — no separate UDL/codegen step needed)
cargo run --bin uniffi-bindgen -- generate \
  --library ../../apps/mobile/modules/db-native/android/src/main/jniLibs/x86_64/libshared_rust.so \
  --language kotlin \
  --out-dir ../../apps/mobile/modules/db-native/android/generated

# 3. Copy the generated file into the Gradle source set (package path must match: uniffi/shared_rust/)
cp ../../apps/mobile/modules/db-native/android/generated/uniffi/shared_rust/shared_rust.kt \
   ../../apps/mobile/modules/db-native/android/src/main/java/uniffi/shared_rust/shared_rust.kt
```

Add `armv7-linux-androideabi`/`i686-linux-android` (`armeabi-v7a`/`x86` ABIs) to step 1 if you
need to support 32-bit devices/emulators; arm64-v8a covers modern physical devices and
x86_64 covers the standard emulator image.

## Regenerating the iOS binding (code only — not built here)

```bash
cd packages/shared-rust
cargo run --bin uniffi-bindgen -- generate \
  --library ../../apps/mobile/modules/db-native/android/src/main/jniLibs/x86_64/libshared_rust.so \
  --language swift \
  --out-dir ../../apps/mobile/modules/db-native/ios/generated
```

(Using the Android `.so` here only to read UniFFI's metadata section to drive codegen — the
generated Swift *source* doesn't depend on the library being for Android. The actual iOS
build needs a real iOS-targeted build, see below.)

## iOS: remaining work (needs a Mac)

1. Add iOS Rust targets: `rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios`
2. Build `packages/shared-rust` for each target (`cargo build --release --target <triple>`)
3. Combine the per-target `.a`/`.dylib` outputs into an `.xcframework` (e.g. via `xcodebuild -create-xcframework`)
4. Vendor the `.xcframework` in `ios/` and reference it from `DbNative.podspec`
   (`s.vendored_frameworks`)
5. `cd apps/mobile && npx expo prebuild --platform ios && cd ios && pod install`
6. Build via Xcode or `npx expo run:ios`

## Building/running the Android app

```bash
cd apps/mobile
npx expo prebuild --platform android   # generates android/ (gitignored, regenerate as needed)
cd android
./gradlew :app:assembleDebug           # or `npx expo run:android` from apps/mobile
```

Requires `JAVA_HOME` pointing at a JDK 17 and `ANDROID_HOME`/`local.properties` configured
for an Android SDK with platform 34 + build-tools 34.0.0 installed.

### Known environment caveats fixed in `apps/mobile/android/build.gradle`

These were pre-existing issues with the Expo SDK 50 / RN 0.73 Android template running on
Windows, unrelated to db-native itself, but they block any Android build until fixed:

- **AGP pinned to 8.2.0** (was unpinned, resolving to 8.1.1): 8.1.x can't parse SDK package
  metadata using schema v4, which newer SDK Manager installs (e.g. bundled with recent
  Unity installs) ship — fails with `Cannot invoke method multiply() on null object`.
- **`reactNativeVersion` pinned to `0.73.6`** in the root `ext` block: `expo/android/build.gradle`
  shells out to `node -e "require('react-native/package.json').version"` via Groovy's
  `.execute().text`, which returns an empty string on this Windows host (a known
  Groovy/Windows process-handling quirk) and crashes version parsing with a null component.
- **`db-native`'s Kotlin/Java compile target set to 17** to match the JDK in use (was 11,
  causing a `compileDebugKotlin`/`compileDebugJavaWithJavac` target mismatch failure).
