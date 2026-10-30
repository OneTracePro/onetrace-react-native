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

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.private_header_files = "ios/**/*.h"
  s.swift_version = "5.9"

  install_modules_dependencies(s)

  # The native OneTrace SDK for iOS is a Swift package (React Native 0.75+ links Swift packages to pods).
  unless defined?(spm_dependency)
    raise "onetrace-react-native needs React Native 0.75 or newer"
  end

  spm_dependency(s,
    url: "https://github.com/OneTracePro/onetrace-ios.git",
    requirement: { kind: "branch", branch: "main" },
    products: ["OneTrace"]
  )
end
