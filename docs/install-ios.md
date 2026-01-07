# Install iOS

## Prerequisites

- Node.js (LTS recommended)
- Xcode (latest)
- Xcode Command Line Tools
- CocoaPods

## Setup

1) Install dependencies:
```
npm install
```

2) Install CocoaPods (if missing):
```
sudo gem install cocoapods
```

## Run on iOS

1) Build and run:
```
npx expo run:ios
```

2) If you prefer to open Xcode directly:
```
open ios/SwiftyCompanion.xcworkspace
```

## Troubleshooting

- If the simulator doesn’t launch, open Xcode once and accept the license.
- If CocoaPods fails, try:
```
cd ios
pod install
```
