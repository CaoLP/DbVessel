fn main() {
    uniffi::generate_scaffolding("./src/shared_rust.udl").unwrap();
}
