const { withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs/promises");
const path = require("path");
module.exports = config => {
  config = withAndroidManifest(config, config => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;
    application["meta-data"] ??= [];
    const name = "com.google.firebase.messaging.default_notification_icon";
    application["meta-data"] = application["meta-data"].filter(item => item.$?.["android:name"] !== name);
    application["meta-data"].push({ $: { "android:name": name, "android:resource": "@drawable/ic_stat_timer" } });
    return config;
  });
  config = withDangerousMod(config, ["android", async config => {
    const directory = path.join(config.modRequest.platformProjectRoot, "app/src/main/res/drawable");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "ic_stat_timer.xml"), `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFFFF" android:pathData="M15,1H9v2h6V1zM11,14h2V8h-2v6zM19.03,7.39l1.42,-1.42c-0.43,-0.51 -0.9,-0.99 -1.41,-1.41l-1.42,1.42C16.07,4.74 14.12,4 12,4c-4.97,0 -9,4.03 -9,9s4.02,9 9,9 9,-4.03 9,-9c0,-2.12 -0.74,-4.07 -1.97,-5.61zM12,20c-3.87,0 -7,-3.13 -7,-7s3.13,-7 7,-7 7,3.13 7,7 -3.13,7 -7,7z"/></vector>`);
    return config;
  }]);
  return config;
};
