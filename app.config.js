module.exports = {
  expo: {
    name: "SYNQ",
    slug: "daily-bloom",
    version: "1.1.0",
    icon: "./logo-saay.png",
    splash: {
      image: "./logo-saay.png",
      resizeMode: "contain",
      backgroundColor: "#0B1017",
    },
    orientation: "portrait",
    userInterfaceStyle: "dark",
    scheme: "dailybloom",
    ios: {
      bundleIdentifier: "com.andrew.dailybloom",
      supportsTablet: true,
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
    },
    android: {
      package: "com.andrew.dailybloom",
      versionCode: 2,
      allowBackup: false,
      adaptiveIcon: {
        foregroundImage: "./logo-saay.png",
        backgroundColor: "#0B1017",
      },
      permissions: ["android.permission.POST_NOTIFICATIONS"],
      blockedPermissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.RECORD_AUDIO",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "com.google.android.gms.permission.AD_ID",
        "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
        "android.permission.ACCESS_ADSERVICES_AD_ID",
      ],
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "expo-asset",
      "expo-font",
      ["expo-audio", { recordAudioAndroid: false, microphonePermission: false }],
      "./plugins/withTimerIcon",
      ["expo-notifications", {
        sounds: [
          "./assets/sounds/success.mp3",
          "./assets/sounds/bell.mp3",
          "./assets/sounds/spark.mp3",
        ],
        defaultChannel: "focus-timer-v2",
      }],
      ["expo-build-properties", {
        ios: { useFrameworks: "static" },
        android: {},
      }],
    ],
    extra: {
      eas: {
        projectId: "7f26d4cb-21f6-49f7-bd6d-b106b0f4571b",
      },
    },
  },
};
