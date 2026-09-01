Pod::Spec.new do |s|
  s.name           = 'DynamicNotchActivity'
  s.version        = '1.0.0'
  s.summary        = 'ActivityKit bridge for the Dynamic Notch app'
  s.description    = 'Starts, updates and ends Live Activities from React Native.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
