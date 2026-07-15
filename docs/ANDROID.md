# Сборка Android (фаза 7)

Web-код оборачивается в APK через Capacitor. Папка `android/` — сгенерированный
нативный проект (закоммичен), правки в нём: ориентация `sensorLandscape`,
immersive fullscreen и keep-screen-on в `MainActivity.java`.

## Требования на машине сборки

- JDK 21 (Temurin/OpenJDK)
- Android SDK (проще всего — Android Studio; или cmdline-tools + `sdkmanager "platforms;android-35" "build-tools;35.0.0"`)
- Переменная `ANDROID_HOME` (или `android/local.properties` с `sdk.dir=...`)

## Команды

```bash
npm run android:apk        # build → cap sync → gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Или пошагово / через студию:

```bash
npm run android:sync       # прод-сборка web + копирование в android/
npx cap open android       # открыть проект в Android Studio
```

После любых правок web-кода перед сборкой APK нужен `npm run android:sync`.

## Что уже настроено

- `vite.config.ts`: `base: './'` — относительные пути для WebView.
- Сейвы: на устройстве — Capacitor Preferences (`PreferencesSave`, чтение при
  старте + write-behind), в браузере — localStorage. Выбор в `src/platform/storage.ts`.
- Ландшафт: `android:screenOrientation="sensorLandscape"` в манифесте.
- Fullscreen immersive + FLAG_KEEP_SCREEN_ON: `MainActivity.java`.
- Тач-зоны: газ — правая половина экрана, тормоз — левая (с фазы 1),
  видимые кнопки из ассетов показываются на тач-устройствах (HUD).
- Слабые устройства: `?res=0.75` (0.5–1) — пониженное внутреннее разрешение,
  камера компенсирует зумом. Для APK можно зашить в `dist/index.html` редирект
  или оставить 1.0 — внутренний буфер и так фиксирован 1280×720.

## Релизная сборка (когда понадобится)

`./gradlew assembleRelease` + подпись: сгенерировать keystore
(`keytool -genkey ...`), прописать в `android/app/build.gradle` signingConfigs.
Не коммитить keystore и пароли.
