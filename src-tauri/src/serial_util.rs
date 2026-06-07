use serialport::{DataBits, FlowControl, Parity, SerialPortType, StopBits};
use std::io::ErrorKind;

pub fn port_type_label(port_type: &SerialPortType) -> String {
    match port_type {
        SerialPortType::UsbPort(_) => "usb".to_string(),
        SerialPortType::PciPort => "pci".to_string(),
        SerialPortType::BluetoothPort => "bluetooth".to_string(),
        SerialPortType::Unknown => "unknown".to_string(),
    }
}

pub fn parse_data_bits(bits: u8) -> Result<DataBits, String> {
    match bits {
        5 => Ok(DataBits::Five),
        6 => Ok(DataBits::Six),
        7 => Ok(DataBits::Seven),
        8 => Ok(DataBits::Eight),
        _ => Err(format!("Unsupported data bits: {bits}")),
    }
}

pub fn parse_parity(parity: &str) -> Result<Parity, String> {
    match parity.to_lowercase().as_str() {
        "none" | "n" => Ok(Parity::None),
        "odd" | "o" => Ok(Parity::Odd),
        "even" | "e" => Ok(Parity::Even),
        _ => Err(format!("Unsupported parity: {parity}")),
    }
}

pub fn parse_stop_bits(bits: &str) -> Result<StopBits, String> {
    match bits.to_lowercase().as_str() {
        "1" | "one" => Ok(StopBits::One),
        "2" | "two" => Ok(StopBits::Two),
        _ => Err(format!("Unsupported stop bits: {bits}")),
    }
}

pub fn parse_flow_control(flow: &str) -> Result<FlowControl, String> {
    match flow.to_lowercase().as_str() {
        "none" => Ok(FlowControl::None),
        "software" | "xonxoff" | "xon/xoff" => Ok(FlowControl::Software),
        "hardware" | "rtscts" | "rts/cts" => Ok(FlowControl::Hardware),
        _ => Err(format!("Unsupported flow control: {flow}")),
    }
}

pub fn classify_read_error(err: &std::io::Error) -> (&'static str, String) {
    let message = err.to_string();
    let lower = message.to_lowercase();

    match err.kind() {
        ErrorKind::NotFound
        | ErrorKind::BrokenPipe
        | ErrorKind::ConnectionAborted
        | ErrorKind::ConnectionReset => ("disconnected", message),
        _ if lower.contains("disconnected")
            || lower.contains("no such device")
            || lower.contains("device not functioning")
            || lower.contains("access denied")
            || lower.contains("port is closed") =>
        {
            ("disconnected", message)
        }
        _ => ("error", message),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Error, ErrorKind};

    #[test]
    fn parse_data_bits_valid() {
        assert!(matches!(parse_data_bits(8), Ok(DataBits::Eight)));
        assert!(matches!(parse_data_bits(7), Ok(DataBits::Seven)));
    }

    #[test]
    fn parse_data_bits_invalid() {
        assert!(parse_data_bits(4).is_err());
    }

    #[test]
    fn parse_parity_variants() {
        assert!(matches!(parse_parity("none"), Ok(Parity::None)));
        assert!(matches!(parse_parity("ODD"), Ok(Parity::Odd)));
        assert!(matches!(parse_parity("e"), Ok(Parity::Even)));
        assert!(parse_parity("mark").is_err());
    }

    #[test]
    fn parse_stop_bits_variants() {
        assert!(matches!(parse_stop_bits("1"), Ok(StopBits::One)));
        assert!(matches!(parse_stop_bits("two"), Ok(StopBits::Two)));
        assert!(parse_stop_bits("1.5").is_err());
    }

    #[test]
    fn parse_flow_control_variants() {
        assert!(matches!(parse_flow_control("none"), Ok(FlowControl::None)));
        assert!(matches!(parse_flow_control("hardware"), Ok(FlowControl::Hardware)));
        assert!(matches!(parse_flow_control("xon/xoff"), Ok(FlowControl::Software)));
        assert!(parse_flow_control("dtr").is_err());
    }

    #[test]
    fn classify_read_error_disconnect_kinds() {
        let err = Error::new(ErrorKind::BrokenPipe, "broken pipe");
        let (status, _) = classify_read_error(&err);
        assert_eq!(status, "disconnected");
    }

    #[test]
    fn classify_read_error_generic_io() {
        let err = Error::new(ErrorKind::Other, "read timeout overflow");
        let (status, _) = classify_read_error(&err);
        assert_eq!(status, "error");
    }

    #[test]
    fn classify_read_error_message_heuristics() {
        let err = Error::new(ErrorKind::Other, "Port is closed");
        let (status, _) = classify_read_error(&err);
        assert_eq!(status, "disconnected");
    }

    #[test]
    fn port_type_label_usb() {
        use serialport::UsbPortInfo;
        let info = SerialPortType::UsbPort(UsbPortInfo {
            vid: 0x1234,
            pid: 0x5678,
            serial_number: None,
            manufacturer: None,
            product: None,
        });
        assert_eq!(port_type_label(&info), "usb");
    }
}
