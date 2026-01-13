APP_DIR := .

.PHONY: install start android ios run-android run-ios web leaderboard leaderboard-sync dev devsync clean

install:
	cd $(APP_DIR) && npm install

start:
	cd $(APP_DIR) && npx expo start

android:
	cd $(APP_DIR) && npx expo start --android

ios:
	cd $(APP_DIR) && npx expo start --ios

run-android:
	cd $(APP_DIR) && npx expo run:android

run-ios:
	cd $(APP_DIR) && npx expo run:ios

web:
	cd $(APP_DIR) && npx expo start --web

leaderboard:
	cd $(APP_DIR)/leaderboard-server && npm install && npm run start

leaderboard-sync:
	cd $(APP_DIR)/leaderboard-server && npm install && npm run sync

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
