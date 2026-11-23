require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "onetrace-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/OneTracePro/onetrace-react-native.git", :tag => "v#{s.version}" }

  s.swift_version = "5.9"
  s.default_subspec = "Core"

  # The module and the sources of OneTrace for iOS (ios/OneTraceSDK, see scripts/vendor-ios-sdk.sh) without geofences:
  # no CoreLocation code, so the app needs no location purpose strings.
  s.subspec "Core" do |core|
    core.source_files = "ios/*.{h,m,mm,swift}", "ios/OneTraceSDK/*.swift", "ios/OneTraceSDK/{Internal,Push}/**/*.swift"
    core.private_header_files = "ios/*.h"
  end

  # Geofences (OneTraceLocation): `pod 'onetrace-react-native/Location', :path => '../node_modules/onetrace-react-native'`
  # in the Podfile, next to the autolinked pod.
  s.subspec "Location" do |location|
    location.dependency "onetrace-react-native/Core"
    location.source_files = "ios/OneTraceSDK/Location/**/*.swift"
    location.pod_target_xcconfig = { "SWIFT_ACTIVE_COMPILATION_CONDITIONS" => "$(inherited) ONETRACE_GEOFENCES" }
  end

  install_modules_dependencies(s)
end
