APP_DIR := .

.PHONY: install start android ios run-android run-ios web android-release-build android-release-install android-release-apk dev clean

install:
	cd $(APP_DIR) && npm install

start:
	cd $(APP_DIR) && npx expo start

android:
	cd $(APP_DIR) && npx expo start --android

ios:
	cd $(APP_DIR) && npx expo start --ios

run-android:
	cd $(APP_DIR) && npx expo run:android --device

run-ios:
	cd $(APP_DIR) && npx expo run:ios

web:
	cd $(APP_DIR) && npx expo start --web

android-release-build:
	cd $(APP_DIR)/android && ./gradlew assembleRelease

android-release-install:
	cd $(APP_DIR)/android && ./gradlew installRelease

android-release-apk:
	@echo "$(APP_DIR)/android/app/build/outputs/apk/release/app-release.apk"

dev:
	cd $(APP_DIR) && npx expo run:android --device

clean:
	cd $(APP_DIR) && rm -rf node_modules .expo
