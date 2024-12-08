import GeniiAssistantPlugin from "../main";
import { Version } from "../types";

export default class VersionManager {
  plugin: GeniiAssistantPlugin;
  currentVersion?: Version;

  constructor(plugin: GeniiAssistantPlugin) {
    this.plugin = plugin;
  }

  async load() {
    const version = this.plugin.manifest.version;

    // check if the version compatible with the format
    if (!/\d+\.\d+\.\d+(-beta)?/.test(version))
      return console.warn("version", version, "is not valid");

    this.currentVersion = version as Version;

    this.plugin.settings.version = this.currentVersion;
    await this.plugin.saveSettings();
  }

  isOldVersion(version: Version) {
    if (!this.currentVersion) return false;
    return this.compare(version, this.currentVersion) < 0;
  }

  // positive if version1 is newer than version2
  compare(version1: Version, version2: Version) {
    const [v1, b1] = (version1 || "0.0.0").split("-");
    const [v2, b2] = (version2 || "0.0.0").split("-");

    const version1Parts = v1.split(".").map(Number);
    const version2Parts = v2.split(".").map(Number);

    for (
      let i = 0;
      i < Math.max(version1Parts.length, version2Parts.length);
      i++
    ) {
      const part1 = version1Parts[i] || 0;
      const part2 = version2Parts[i] || 0;

      if (part1 > part2) {
        return 1;
      } else if (part1 < part2) {
        return -1;
      }
    }

    // If one version is stable and the other is beta, consider the beta as newer
    if (b1 && !b2) {
      return 1;
    } else if (!b1 && b2) {
      return -1;
    }

    // Compare beta versions
    if (b1 && b2) {
      if (b1 > b2) {
        return 1;
      } else if (b1 < b2) {
        return -1;
      }
    }

    return 0;
  }
}
