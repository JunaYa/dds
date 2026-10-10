use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct ShortcutStatus {
    supported: bool,
    shortcut: String,
    enabled: bool,
    error: Option<String>,
}

#[cfg(desktop)]
mod desktop {
    use super::ShortcutStatus;
    use std::{fs, sync::Mutex};
    use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

    pub struct QuickRecordState {
        pub status: Mutex<ShortcutStatus>,
        window: Mutex<Option<WindowState>>,
    }
    struct WindowState {
        fullscreen: bool,
        always_on_top: bool,
        visible: bool,
        minimized: bool,
    }
    fn parse(value: &str) -> Result<Shortcut, String> {
        let shortcut: Shortcut = value.parse().map_err(|_| "Invalid shortcut".to_string())?;
        if shortcut.mods.is_empty() {
            return Err("Use at least one modifier key".into());
        }
        Ok(shortcut)
    }
    fn register(app: &AppHandle, value: &str) -> Result<(), String> {
        app.global_shortcut()
            .on_shortcut(parse(value)?, |app, _, event| {
                if event.state == ShortcutState::Pressed {
                    if let Err(error) = app.emit_to("main", "quick-record-open", ()) {
                        tracing::error!(%error, "Could not open quick recording");
                    }
                }
            })
            .map_err(|error| error.to_string())
    }
    pub fn setup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let path = app.path().app_config_dir()?.join("quick-record.json");
        let mut status = ShortcutStatus {
            supported: true,
            shortcut: "CommandOrControl+Shift+Space".into(),
            enabled: false,
            error: None,
        };
        let requested = match fs::read_to_string(path) {
            Ok(raw) => match serde_json::from_str::<Option<String>>(&raw) {
                Ok(value) => value,
                Err(error) => {
                    status.error = Some(error.to_string());
                    None
                }
            },
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Some(status.shortcut.clone())
            }
            Err(error) => {
                status.error = Some(error.to_string());
                None
            }
        };
        if let Some(value) = requested {
            status.shortcut = value;
            match register(app, &status.shortcut) {
                Ok(()) => status.enabled = true,
                Err(error) => status.error = Some(error),
            }
        }
        app.manage(QuickRecordState {
            status: Mutex::new(status),
            window: Mutex::new(None),
        });
        Ok(())
    }
    pub fn status(app: &AppHandle) -> Result<ShortcutStatus, String> {
        Ok(app
            .state::<QuickRecordState>()
            .status
            .lock()
            .map_err(|e| e.to_string())?
            .clone())
    }
    pub fn update(app: &AppHandle, shortcut: Option<String>) -> Result<ShortcutStatus, String> {
        let state = app.state::<QuickRecordState>();
        let mut status = state.status.lock().map_err(|e| e.to_string())?;
        let next = shortcut.as_deref().map(parse).transpose()?;
        let old = if status.enabled {
            Some(parse(&status.shortcut)?)
        } else {
            None
        };
        let changed = next != old;
        let path = app.path().app_config_dir().map_err(|e| e.to_string())?;
        if changed {
            if let Some(value) = shortcut.as_deref() {
                register(app, value)?;
            }
        }
        let save = (|| -> Result<(), Box<dyn std::error::Error>> {
            fs::create_dir_all(&path)?;
            fs::write(
                path.join("quick-record.tmp"),
                serde_json::to_vec(&shortcut)?,
            )?;
            fs::rename(
                path.join("quick-record.tmp"),
                path.join("quick-record.json"),
            )?;
            Ok(())
        })();
        if let Err(error) = save {
            if changed {
                if let Some(next) = next {
                    let _ = app.global_shortcut().unregister(next);
                }
            }
            return Err(error.to_string());
        }
        if changed {
            if let Some(old) = old {
                if let Err(error) = app.global_shortcut().unregister(old) {
                    // Keep the old setting recoverable if the OS cannot release it.
                    let previous = Some(status.shortcut.clone());
                    let _ = fs::write(
                        path.join("quick-record.json"),
                        serde_json::to_vec(&previous).map_err(|e| e.to_string())?,
                    );
                    if let Some(next) = next {
                        let _ = app.global_shortcut().unregister(next);
                    }
                    return Err(error.to_string());
                }
            }
        }
        status.enabled = shortcut.is_some();
        if let Some(value) = shortcut {
            status.shortcut = value;
        }
        status.error = None;
        Ok(status.clone())
    }
    fn restore(window: &WebviewWindow, previous: &WindowState) -> Result<(), String> {
        window
            .set_fullscreen(previous.fullscreen)
            .map_err(|e| e.to_string())?;
        window
            .set_always_on_top(previous.always_on_top)
            .map_err(|e| e.to_string())?;
        if previous.minimized {
            window.minimize().map_err(|e| e.to_string())?;
        }
        if !previous.visible {
            window.hide().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    pub fn present(app: &AppHandle, open: bool) -> Result<(), String> {
        let window = app
            .get_webview_window("main")
            .ok_or("Main window unavailable")?;
        let state = app.state::<QuickRecordState>();
        let mut previous = state.window.lock().map_err(|e| e.to_string())?;
        if open {
            if previous.is_some() {
                return Ok(());
            }
            let snapshot = WindowState {
                fullscreen: window.is_fullscreen().map_err(|e| e.to_string())?,
                always_on_top: window.is_always_on_top().map_err(|e| e.to_string())?,
                visible: window.is_visible().map_err(|e| e.to_string())?,
                minimized: window.is_minimized().map_err(|e| e.to_string())?,
            };
            *previous = Some(snapshot);
            let result = (|| -> tauri::Result<()> {
                window.unminimize()?;
                window.set_always_on_top(true)?;
                window.set_fullscreen(true)?;
                window.show()?;
                window.set_focus()
            })();
            if let Err(error) = result {
                if restore(&window, previous.as_ref().unwrap()).is_ok() {
                    *previous = None;
                }
                return Err(error.to_string());
            }
        } else if let Some(snapshot) = previous.as_ref() {
            restore(&window, snapshot)?;
            *previous = None;
        }
        Ok(())
    }
    pub fn close_requested(window: &tauri::Window, api: &tauri::CloseRequestApi) {
        if window.label() != "main" {
            return;
        }
        api.prevent_close();
        let state = window.state::<QuickRecordState>();
        let active = state
            .window
            .lock()
            .map(|value| value.is_some())
            .unwrap_or(false);
        if active {
            let _ = window.emit("quick-record-close", ());
        } else if let Err(error) = window.hide() {
            tracing::error!(%error, "Could not hide main window");
        }
    }

    #[cfg(test)]
    mod tests {
        use super::parse;

        #[test]
        fn accepts_default_and_captured_shortcuts() {
            for value in ["CommandOrControl+Shift+Space", "Control+Shift+KeyK", "Super+Alt+Digit2", "Alt+F8"] {
                assert!(parse(value).is_ok(), "{value}");
            }
        }

        #[test]
        fn rejects_plain_typing_keys_and_invalid_shortcuts() {
            for value in ["KeyA", "Digit1", "Space", "", "Super+", "Control+Unknown"] {
                assert!(parse(value).is_err(), "{value}");
            }
        }
    }
}

#[cfg(desktop)]
pub use desktop::{close_requested, setup};

#[tauri::command]
pub async fn quick_record_status(app: tauri::AppHandle) -> Result<ShortcutStatus, String> {
    #[cfg(desktop)]
    {
        desktop::status(&app)
    }
    #[cfg(mobile)]
    {
        let _ = app;
        Ok(ShortcutStatus {
            supported: false,
            shortcut: String::new(),
            enabled: false,
            error: None,
        })
    }
}

#[tauri::command]
pub async fn set_quick_record_shortcut(
    app: tauri::AppHandle,
    shortcut: Option<String>,
) -> Result<ShortcutStatus, String> {
    #[cfg(desktop)]
    {
        desktop::update(&app, shortcut)
    }
    #[cfg(mobile)]
    {
        let _ = (app, shortcut);
        Err("Desktop only".into())
    }
}

#[tauri::command]
pub async fn present_quick_record(app: tauri::AppHandle, open: bool) -> Result<(), String> {
    #[cfg(desktop)]
    {
        desktop::present(&app, open)
    }
    #[cfg(mobile)]
    {
        let _ = (app, open);
        Err("Desktop only".into())
    }
}
