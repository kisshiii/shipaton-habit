Pod::Spec.new do |s|
  s.name           = 'KatsuSoftGuard'
  s.version        = '1.0.0'
  s.summary        = 'On-device check for words that attack the person rather than the action'
  s.description    = 'Tier 2 soft guard for KATSU. Uses Apple Foundation Models on device only.'
  s.license        = 'MIT'
  s.author         = 'kishikawa'
  s.homepage       = 'https://github.com/kisshiii/shipaton-habit'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # FoundationModels は iOS 26 から。古い iOS でも起動できるよう弱くリンクする
  s.weak_frameworks = 'FoundationModels'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
