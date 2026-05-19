uniffi::include_scaffolding!("shared_rust");

pub fn hello_world() -> String {
    "Hello from Rust!".to_string()
}
