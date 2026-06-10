// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  #[cfg(not(debug_assertions))]
  std::env::set_var(
    "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
    concat!(
      "--disable-gpu ",
      "--disable-extensions ",
      "--disable-default-apps ",
      "--disable-component-extensions-with-background-pages ",
      "--disable-smooth-scrolling ",
      "--disable-background-networking ",
      "--disable-sync ",
      "--disable-features=Translate,ChromeWhatsNewUI,InterestFeedContentSuggestions,UseSkiaRenderer ",
    ),
  );
  app_lib::run();
}
