# Install Android

## Prerequisites

- Node.js (LTS recommended)
- Android Studio + Android SDK
- JDK 17

## Setup

1) Install dependencies:
```
npm install
```

2) Install JDK 17 (Temurin):
```
brew install --cask temurin@17
```

3) Set JAVA_HOME (zsh):
```
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc
```

4) Verify:
```
java -version
echo $JAVA_HOME
```

## Run on Android

1) Start the emulator in Android Studio, or keep a device connected.
2) Build and run:
```
npx expo run:android
```

## Gradle compatibility

The generated Android project is pinned to Gradle 9.0.0 so Linux machines with
Gradle 9.0 can build it without needing a newer 9.3.x install.

Use the project wrapper whenever possible:
```
cd android
./gradlew --version
./gradlew assembleRelease
```

If you regenerate native files with Expo, the local config plugin
`plugins/with-gradle-compat.js` rewrites the Android wrapper back to Gradle
9.0.0.

## Troubleshooting

- If you see "Unable to locate a Java Runtime", confirm `JAVA_HOME` is set to JDK 17.
- If Gradle fails, try:
```
./android/gradlew --stop
npx expo run:android
```
