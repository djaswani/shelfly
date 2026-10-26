// The React Native template's "Bundle React Native code and images" build phase runs the
// bundler script via an unquoted backtick substitution, so a project path containing a space
// (e.g. ".../Misc Projects/...") is split in two and the iOS build fails. Quote it.
const { withXcodeProject } = require('expo/config-plugins');

// The backticked command that resolves react-native-xcode.sh (quotes inside may be escaped as \").
const UNQUOTED = /`([^`]*react-native-xcode\.sh[^`]*)`/;

module.exports = function withQuotedBundleScript(config) {
  return withXcodeProject(config, (cfg) => {
    const phases = cfg.modResults.hash.project.objects.PBXShellScriptBuildPhase || {};
    for (const phase of Object.values(phases)) {
      if (typeof phase !== 'object') continue;
      const script = phase.shellScript;
      if (typeof script !== 'string' || !UNQUOTED.test(script)) continue;
      // Match the file's quoting style: inside the pbxproj string, quotes are written as \".
      const q = script.includes('\\"') ? '\\"' : '"';
      phase.shellScript = script.replace(UNQUOTED, (_, cmd) => `${q}$(${cmd})${q}`);
    }
    return cfg;
  });
};
