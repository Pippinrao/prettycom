use std::io::{Read, Write};
use std::thread;
use std::time::Duration;

fn test_port_a() -> String {
    std::env::var("PRETTYCOM_TEST_PORT_A").unwrap_or_else(|_| "COM10".into())
}

fn test_port_b() -> String {
    std::env::var("PRETTYCOM_TEST_PORT_B").unwrap_or_else(|_| "COM11".into())
}

fn open_with_hint(path: &str) -> Box<dyn serialport::SerialPort> {
    serialport::new(path, 115_200)
        .timeout(Duration::from_millis(800))
        .open()
        .unwrap_or_else(|err| {
            panic!(
                "Failed to open {path}. Install com0com and create the COM pair:\n  npm run test:ports:install\n{err}"
            )
        })
}

#[test]
fn com0com_null_modem_loopback() {
    let port_a = test_port_a();
    let port_b = test_port_b();

    let mut writer = open_with_hint(&port_a);
    let mut reader = open_with_hint(&port_b);

    let payload = b"AT\r\n";
    writer
        .write_all(payload)
        .expect("write on test port A should succeed");

    thread::sleep(Duration::from_millis(120));

    let mut buf = [0u8; 32];
    let read_len = reader
        .read(&mut buf)
        .expect("read on test port B should succeed");
    assert_eq!(&buf[..read_len], payload);
}
