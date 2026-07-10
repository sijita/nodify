//! Tests de lectura de config (modelo por defecto) por adaptador.

use nodify_adapters::{ClaudeAdapter, CodexAdapter, KiloCodeAdapter, OpenCodeAdapter, PiAdapter};
use nodify_core::Adapter;

#[test]
fn claude_reads_model_from_settings_json() {
    let settings = r#"{ "model": "claude-sonnet-5", "editorMode": "vim" }"#;
    assert_eq!(ClaudeAdapter.parse_model(settings).as_deref(), Some("claude-sonnet-5"));
    assert_eq!(ClaudeAdapter.parse_model("{}"), None);
}

#[test]
fn codex_reads_model_from_toml() {
    let toml = "model = \"gpt-5.5\"\nmodel_provider = \"openai\"\n";
    assert_eq!(CodexAdapter.parse_model(toml).as_deref(), Some("gpt-5.5"));
}

#[test]
fn opencode_reads_provider_slashed_model() {
    let json = r#"{ "model": "anthropic/claude-sonnet-4" }"#;
    assert_eq!(
        OpenCodeAdapter.parse_model(json).as_deref(),
        Some("anthropic/claude-sonnet-4")
    );
}

#[test]
fn set_model_roundtrips_and_preserves_each_format() {
    // Claude: preserva otras claves de settings.json
    let claude = ClaudeAdapter
        .set_model(r#"{ "editorMode": "vim" }"#, "claude-opus-4-8")
        .unwrap();
    assert!(claude.contains("editorMode"));
    assert_eq!(ClaudeAdapter.parse_model(&claude).as_deref(), Some("claude-opus-4-8"));

    // Codex: preserva comentario
    let codex = CodexAdapter
        .set_model("# mi config\nmodel = \"old\"\n", "gpt-5.5")
        .unwrap();
    assert!(codex.contains("# mi config"));
    assert_eq!(CodexAdapter.parse_model(&codex).as_deref(), Some("gpt-5.5"));

    // OpenCode: preserva comentario y otras claves (splice)
    let oc = OpenCodeAdapter
        .set_model("{\n  // gen\n  \"model\": \"old\",\n  \"theme\": \"dark\"\n}", "anthropic/x")
        .unwrap();
    assert!(oc.contains("// gen"));
    assert!(oc.contains("\"theme\""));
    assert_eq!(OpenCodeAdapter.parse_model(&oc).as_deref(), Some("anthropic/x"));
}

#[test]
fn set_env_writes_claude_env_block_others_unsupported() {
    let out = ClaudeAdapter
        .set_env(r#"{ "model": "x" }"#, "ANTHROPIC_API_KEY", "sk-demo")
        .unwrap();
    assert!(out.contains("\"env\""));
    assert!(out.contains("ANTHROPIC_API_KEY"));
    assert!(out.contains("sk-demo"));
    assert!(out.contains("\"model\"")); // preserva lo demás

    // Codex, OpenCode, Kilo y Pi leen las env vars del shell: no soportan escribir en archivo
    assert!(CodexAdapter.set_env("", "K", "v").is_err());
    assert!(OpenCodeAdapter.set_env("", "K", "v").is_err());
    assert!(KiloCodeAdapter.set_env("", "K", "v").is_err());
    assert!(PiAdapter.set_env("", "K", "v").is_err());
}

#[test]
fn kilo_reads_provider_slashed_model_from_jsonc() {
    let jsonc = "{\n  // gen\n  \"model\": \"anthropic/claude-sonnet-4\"\n}";
    assert_eq!(
        KiloCodeAdapter.parse_model(jsonc).as_deref(),
        Some("anthropic/claude-sonnet-4")
    );
    // set_model preserva comentario y otras claves (splice)
    let out = KiloCodeAdapter
        .set_model("{\n  // gen\n  \"model\": \"old\",\n  \"theme\": \"dark\"\n}", "openai/gpt-5")
        .unwrap();
    assert!(out.contains("// gen"));
    assert!(out.contains("\"theme\""));
    assert_eq!(KiloCodeAdapter.parse_model(&out).as_deref(), Some("openai/gpt-5"));
}

#[test]
fn pi_reads_default_model_and_preserves_provider() {
    let settings = r#"{ "defaultProvider": "anthropic", "defaultModel": "claude-sonnet-4-20250514" }"#;
    assert_eq!(
        PiAdapter.parse_model(settings).as_deref(),
        Some("claude-sonnet-4-20250514")
    );
    // set_model cambia defaultModel pero deja defaultProvider intacto
    let out = PiAdapter.set_model(settings, "gpt-5").unwrap();
    assert!(out.contains("defaultProvider"));
    assert!(out.contains("anthropic"));
    assert_eq!(PiAdapter.parse_model(&out).as_deref(), Some("gpt-5"));
}
