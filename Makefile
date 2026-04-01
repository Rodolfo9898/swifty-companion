APP_DIR := .

.PHONY: install start android ios run-android run-ios web android-release-build android-release-install android-release-apk leaderboard leaderboard-sync leaderboard-export-snapshot dev devsync clean

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

leaderboard:
	cd $(APP_DIR)/leaderboard-server && npm install && npm run start

leaderboard-sync:
	cd $(APP_DIR)/leaderboard-server && npm install && npm run sync

leaderboard-export-snapshot:
	cd $(APP_DIR)/leaderboard-server && npm install && npm run export-snapshot

dev:
	cd $(APP_DIR)/leaderboard-server && npm install && npm run start &
	cd $(APP_DIR) && npx expo run:android --device

devsync:
	cd $(APP_DIR)/leaderboard-server && npm install && npm run sync
	cd $(APP_DIR) && git add leaderboard-server/data/leaderboard.db
	cd $(APP_DIR) && git commit -m "db-update"
	cd $(APP_DIR) && git push

clean:
	cd $(APP_DIR) && rm -rf node_modules .expo
