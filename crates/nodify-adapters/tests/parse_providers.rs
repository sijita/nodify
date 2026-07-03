//! Tests de lectura de proveedores (sin valores de secretos, solo referencias env).

use nodify_adapters::{ClaudeAdapter, CodexAdapter, OpenCodeAdapter};
use nodify_core::Adapter;

#[test]
fn codex_reads_model_providers() {
    let toml = r#"
        [model_providers.openrouter]
        name = "OpenRouter"
        base_url = "https://openrouter.ai/api/v1"
        env_key = "OPENROUTER_API_KEY"
    "#;
    let ps = CodexAdapter.parse_providers(toml);
    assert_eq!(ps.len(), 1);
    assert_eq!(ps[0].id, "openrouter");
    assert_eq!(ps[0].name.as_deref(), Some("OpenRouter"));
    assert_eq!(ps[0].base_url.as_deref(), Some("https://openrouter.ai/api/v1"));
    assert_eq!(ps[0].key_env.as_deref(), Some("OPENROUTER_API_KEY"));
}

#[test]
fn opencode_reads_provider_block() {
    let json = r#"{
      "provider": {
        "featherless": {
          "name": "Featherless",
          "npm": "@ai-sdk/openai-compatible",
          "env": ["FEATHERLESS_API_KEY"],
          "options": { "baseURL": "https://api.featherless.ai/v1" }
        }
      }
    }"#;
    let ps = OpenCodeAdapter.parse_providers(json);
    assert_eq!(ps.len(), 1);
    assert_eq!(ps[0].id, "featherless");
    assert_eq!(ps[0].base_url.as_deref(), Some("https://api.featherless.ai/v1"));
    assert_eq!(ps[0].key_env.as_deref(), Some("FEATHERLESS_API_KEY"));
}

#[test]
fn claude_has_no_file_providers() {
    assert!(ClaudeAdapter.parse_providers("{}").is_empty());
}
