require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'DbNative'
  s.version        = package['version']
  s.summary        = package['description']
  s.author         = ''
  s.homepage       = 'https://github.com/dbvessel/dbvessel'
  s.platform       = :ios, '13.0'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift', 'generated/*.swift'

  # NOTE: not wired up yet. Requires an XCFramework built from packages/shared-rust for
  # iOS targets (aarch64-apple-ios, aarch64-apple-ios-sim, x86_64-apple-ios) — see
  # DbNativeModule.swift for the build steps. Once built, vendor it here, e.g.:
  # s.vendored_frameworks = 'SharedRustFFI.xcframework'
  s.preserve_paths = 'generated/shared_rustFFI.h', 'generated/shared_rustFFI.modulemap'
end
