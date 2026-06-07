use std::io::{Read, Write};
use std::time::Duration;

fn main() {
    match serialport::new("COM5", 115200)
        .timeout(Duration::from_millis(50))
        .open()
    {
        Ok(mut port) => {
            println!("OPEN OK: COM5");
            match port.try_clone() {
                Ok(mut reader) => {
                    println!("TRY_CLONE OK");
                    let _ = reader.read(&mut [0u8; 1]);
                }
                Err(e) => println!("TRY_CLONE FAIL: {}", e),
            }
        }
        Err(e) => println!("OPEN FAIL: {}", e),
    }
}
