// iOS 27 refuses to launch apps that don't adopt the UIScene life cycle. Expo 57 ships
// `ExpoAppSceneDelegate` for this (node_modules/expo/ios/AppDelegates/ExpoAppSceneDelegate.swift),
// but the generated project doesn't use it yet. This plugin wires it up:
//  - registers EXExpoAppSceneDelegate in Info.plist's scene manifest
//  - makes AppDelegate an ExpoReactNativeFactoryProvider (the scene delegate reads its factory)
//  - drops AppDelegate's own window creation, since the scene delegate now creates the window
// Remove once Expo's template does this itself.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const WINDOW_BLOCK = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    };
    return cfg;
  });

  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') throw new Error('withSceneLifecycle expects a Swift AppDelegate');
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    }
    if (WINDOW_BLOCK.test(src)) {
      src = src.replace(WINDOW_BLOCK, '\n    // The window and React Native start in ExpoAppSceneDelegate (see plugins/withSceneLifecycle.js).\n');
    }
    if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIWindow(frame:')) {
      throw new Error('withSceneLifecycle: AppDelegate template changed; update the plugin');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
