use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use serialport::{SerialPort, SerialPortType};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

mod serial_util;
use serial_util::{
    classify_read_error, parse_data_bits, parse_flow_control, parse_parity, parse_stop_bits,
    port_type_label,
};
struct OpenPort {
    writer: Box<dyn SerialPort>,
    stop: Arc<AtomicBool>,
}

struct PortState {
    ports: HashMap<String, OpenPort>,
}

impl PortState {
    fn new() -> Self {
        Self {
            ports: HashMap::new(),
        }
    }

    fn close_all(&mut self) {
        for open in self.ports.values() {
            open.stop.store(true, Ordering::Relaxed);
        }
        self.ports.clear();
    }
}

impl Drop for PortState {
    fn drop(&mut self) {
        self.close_all();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortInfo {
    pub name: String,
    pub port_type: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialConfig {
    pub baud_rate: u32,
    pub data_bits: u8,
    pub parity: String,
    pub stop_bits: String,
    pub flow_control: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SerialRxPayload {
    session_id: String,
    data: String,
    timestamp_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SerialStatusPayload {
    session_id: String,
    status: String,
    message: String,
}

fn port_description(port_type: &SerialPortType) -> String {
    match port_type {
        SerialPortType::UsbPort(info) => {
            let mut parts = Vec::new();
            if let Some(manufacturer) = &info.manufacturer {
                parts.push(manufacturer.clone());
            }
            if let Some(product) = &info.product {
                parts.push(product.clone());
            }
            if let Some(serial) = &info.serial_number {
                parts.push(format!("S/N: {serial}"));
            }
            if parts.is_empty() {
                if info.vid != 0 || info.pid != 0 {
                    return format!("VID:{:04X} PID:{:04X}", info.vid, info.pid);
                }
                "USB serial port".to_string()
            } else {
                parts.join(" · ")
            }
        }
        SerialPortType::PciPort => "PCI serial port".to_string(),
        SerialPortType::BluetoothPort => "Bluetooth serial port".to_string(),
        SerialPortType::Unknown => "Serial port".to_string(),
    }
}

fn timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn emit_serial_status(app: &AppHandle, session_id: &str, status: &str, message: String) {
    let _ = app.emit(
        "serial-status",
        SerialStatusPayload {
            session_id: session_id.to_string(),
            status: status.to_string(),
            message,
        },
    );
}

fn spawn_read_thread(
    app: AppHandle,
    session_id: String,
    mut reader: Box<dyn SerialPort>,
    stop: Arc<AtomicBool>,
) {
    thread::spawn(move || {
        let mut buffer = [0u8; 4096];

        loop {
            if stop.load(Ordering::Relaxed) {
                break;
            }

            match reader.read(&mut buffer) {
                Ok(0) => continue,
                Ok(n) => {
                    let payload = SerialRxPayload {
                        session_id: session_id.clone(),
                        data: STANDARD.encode(&buffer[..n]),
                        timestamp_ms: timestamp_ms(),
                    };
                    if app.emit("serial-rx", payload).is_err() {
                        break;
                    }
                }
                Err(ref err) if err.kind() == std::io::ErrorKind::TimedOut => continue,
                Err(err) => {
                    let (status, message) = classify_read_error(&err);
                    emit_serial_status(&app, &session_id, status, message);
                    break;
                }
            }
        }
    });
}

#[tauri::command]
fn list_ports() -> Result<Vec<PortInfo>, String> {
    serialport::available_ports()
        .map_err(|err| err.to_string())?
        .into_iter()
        .map(|port| {
            Ok(PortInfo {
                name: port.port_name,
                port_type: port_type_label(&port.port_type),
                description: port_description(&port.port_type),
            })
        })
        .collect()
}

#[tauri::command]
fn open_port(
    app: AppHandle,
    state: State<'_, Arc<Mutex<PortState>>>,
    session_id: String,
    path: String,
    baud_rate: u32,
    data_bits: u8,
    parity: String,
    stop_bits: String,
    flow_control: String,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|err| err.to_string())?;

    if guard.ports.contains_key(&session_id) {
        return Err(format!("Session {session_id} already has an open port"));
    }

    let port = serialport::new(&path, baud_rate)
        .data_bits(parse_data_bits(data_bits)?)
        .parity(parse_parity(&parity)?)
        .stop_bits(parse_stop_bits(&stop_bits)?)
        .flow_control(parse_flow_control(&flow_control)?)
        .timeout(Duration::from_millis(50))
        .open()
        .map_err(|err| err.to_string())?;

    let stop = Arc::new(AtomicBool::new(false));
    let reader = port.try_clone().map_err(|err| err.to_string())?;

    spawn_read_thread(app, session_id.clone(), reader, stop.clone());

    guard.ports.insert(
        session_id,
        OpenPort {
            writer: port,
            stop,
        },
    );

    Ok(())
}

#[tauri::command]
fn write_port(
    state: State<'_, Arc<Mutex<PortState>>>,
    session_id: String,
    data: Vec<u8>,
) -> Result<usize, String> {
    let mut guard = state.lock().map_err(|err| err.to_string())?;
    let open = guard
        .ports
        .get_mut(&session_id)
        .ok_or_else(|| format!("Session {session_id} has no open port"))?;

    open.writer.write(&data).map_err(|err| err.to_string())
}

#[tauri::command]
fn close_port(state: State<'_, Arc<Mutex<PortState>>>, session_id: String) -> Result<(), String> {
    let mut guard = state.lock().map_err(|err| err.to_string())?;

    if let Some(open) = guard.ports.remove(&session_id) {
        open.stop.store(true, Ordering::Relaxed);
    }

    Ok(())
}

fn close_all_ports(state: &Arc<Mutex<PortState>>) {
    match state.lock() {
        Ok(mut guard) => guard.close_all(),
        Err(err) => log::error!("failed to close serial ports during shutdown: {err}"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::new(Mutex::new(PortState::new())))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_ports,
            open_port,
            write_port,
            close_port,
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                let state = window.state::<Arc<Mutex<PortState>>>();
                close_all_ports(&state);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn close_all_sets_stop_flags_and_removes_ports() {
        let stop_a = Arc::new(AtomicBool::new(false));
        let stop_b = Arc::new(AtomicBool::new(false));
        let mut state = PortState::new();
        state.ports.insert("a".into(), test_open_port(stop_a.clone()));
        state.ports.insert("b".into(), test_open_port(stop_b.clone()));

        state.close_all();

        assert!(stop_a.load(Ordering::Relaxed));
        assert!(stop_b.load(Ordering::Relaxed));
        assert!(state.ports.is_empty());
    }

    #[test]
    fn dropping_port_state_stops_open_ports() {
        let stop = Arc::new(AtomicBool::new(false));
        let mut state = PortState::new();
        state.ports.insert("a".into(), test_open_port(stop.clone()));

        drop(state);

        assert!(stop.load(Ordering::Relaxed));
    }

    fn test_open_port(stop: Arc<AtomicBool>) -> OpenPort {
        OpenPort {
            writer: Box::new(MockSerialPort),
            stop,
        }
    }

    struct MockSerialPort;

    impl Read for MockSerialPort {
        fn read(&mut self, _buf: &mut [u8]) -> std::io::Result<usize> {
            Ok(0)
        }
    }

    impl Write for MockSerialPort {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            Ok(buf.len())
        }

        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    impl SerialPort for MockSerialPort {
        fn name(&self) -> Option<String> {
            Some("MOCK".into())
        }

        fn baud_rate(&self) -> serialport::Result<u32> {
            Ok(115200)
        }

        fn data_bits(&self) -> serialport::Result<serialport::DataBits> {
            Ok(serialport::DataBits::Eight)
        }

        fn flow_control(&self) -> serialport::Result<serialport::FlowControl> {
            Ok(serialport::FlowControl::None)
        }

        fn parity(&self) -> serialport::Result<serialport::Parity> {
            Ok(serialport::Parity::None)
        }

        fn stop_bits(&self) -> serialport::Result<serialport::StopBits> {
            Ok(serialport::StopBits::One)
        }

        fn timeout(&self) -> Duration {
            Duration::from_millis(50)
        }

        fn set_baud_rate(&mut self, _baud_rate: u32) -> serialport::Result<()> {
            Ok(())
        }

        fn set_data_bits(&mut self, _data_bits: serialport::DataBits) -> serialport::Result<()> {
            Ok(())
        }

        fn set_flow_control(
            &mut self,
            _flow_control: serialport::FlowControl,
        ) -> serialport::Result<()> {
            Ok(())
        }

        fn set_parity(&mut self, _parity: serialport::Parity) -> serialport::Result<()> {
            Ok(())
        }

        fn set_stop_bits(&mut self, _stop_bits: serialport::StopBits) -> serialport::Result<()> {
            Ok(())
        }

        fn set_timeout(&mut self, _timeout: Duration) -> serialport::Result<()> {
            Ok(())
        }

        fn write_request_to_send(&mut self, _level: bool) -> serialport::Result<()> {
            Ok(())
        }

        fn write_data_terminal_ready(&mut self, _level: bool) -> serialport::Result<()> {
            Ok(())
        }

        fn read_clear_to_send(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }

        fn read_data_set_ready(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }

        fn read_ring_indicator(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }

        fn read_carrier_detect(&mut self) -> serialport::Result<bool> {
            Ok(false)
        }

        fn bytes_to_read(&self) -> serialport::Result<u32> {
            Ok(0)
        }

        fn bytes_to_write(&self) -> serialport::Result<u32> {
            Ok(0)
        }

        fn clear(&self, _buffer_to_clear: serialport::ClearBuffer) -> serialport::Result<()> {
            Ok(())
        }

        fn try_clone(&self) -> serialport::Result<Box<dyn SerialPort>> {
            Ok(Box::new(MockSerialPort))
        }

        fn set_break(&self) -> serialport::Result<()> {
            Ok(())
        }

        fn clear_break(&self) -> serialport::Result<()> {
            Ok(())
        }
    }
}
