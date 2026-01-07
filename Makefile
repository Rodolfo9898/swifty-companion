APP_DIR := .

.PHONY: install start android ios web clean

install:
	cd $(APP_DIR) && npm install

start:
	cd $(APP_DIR) && npx expo start

android:
	cd $(APP_DIR) && npx expo start --android

ios:
	cd $(APP_DIR) && npx expo start --ios

web:
	cd $(APP_DIR) && npx expo start --web

clean:
	cd $(APP_DIR) && rm -rf node_modules .expo
