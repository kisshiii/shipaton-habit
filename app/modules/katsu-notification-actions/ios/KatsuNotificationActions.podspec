Pod::Spec.new do |s|
  s.name           = 'KatsuNotificationActions'
  s.version        = '1.0.0'
  s.summary        = 'Schedules the "Again in 10 min" notification natively'
  s.description    = 'Handles the snooze action of KATSU notifications without waiting for JS, so it works while the app is suspended or not running.'
  s.license        = 'MIT'
  s.author         = 'kishikawa'
  s.homepage       = 'https://github.com/kisshiii/shipaton-habit'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # NotificationCenterManager / NotificationDelegate を使う
  s.dependency 'ExpoNotifications'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
