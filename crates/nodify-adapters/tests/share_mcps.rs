//! Tests del feature estrella: compartir un MCP entre agentes con formatos distintos.

use nodify_adapters::{share_mcp, ClaudeAdapter, CodexAdapter, OpenCodeAdapter};
use nodify_core::{Adapter, SecretValue, Transport};

#[test]
fn share_http_mcp_from_claude_to_codex_translates_format() {
    let claude = r#"{
      "mcpServers": {
        "github": { "type": "http", "url": "https://api.github.com/mcp",
                    "headers": { "X-Api": "tok123" } }
      }
    }"#;

    let codex_out = share_mcp(&ClaudeAdapter, claude, &CodexAdapter, "", "github").unwrap();

    // se escribió como tabla TOML de Codex con url + http_headers
    assert!(codex_out.contains("[mcp_servers.github]"));
    assert!(codex_out.contains("url = \"https://api.github.com/mcp\""));
    assert!(codex_out.contains("http_headers"));

    // y round-trip: Codex lo vuelve a leer igual
    let back = CodexAdapter.parse_mcps(&codex_out).unwrap();
    let gh = back.iter().find(|m| m.name == "github").unwrap();
    assert_eq!(gh.transport, Transport::Http);
    assert_eq!(
        gh.headers.get("X-Api"),
        Some(&SecretValue::Inline("tok123".into()))
    );
}

#[test]
fn share_stdio_mcp_from_claude_to_opencode_normalizes_command_and_env() {
    let claude = r#"{
      "mcpServers": {
        "fs": { "type": "stdio", "command": "npx", "args": ["-y", "@mcp/fs"],
                "env": { "ROOT": "/data" } }
      }
    }"#;

    let oc_out = share_mcp(&ClaudeAdapter, claude, &OpenCodeAdapter, "", "fs").unwrap();

    // OpenCode: command como array + `environment` (no `env`) + type local
    assert!(oc_out.contains("\"type\": \"local\""));
    assert!(oc_out.contains("\"environment\""));

    let back = OpenCodeAdapter.parse_mcps(&oc_out).unwrap();
    let fs = back.iter().find(|m| m.name == "fs").unwrap();
    assert_eq!(fs.transport, Transport::Stdio);
    assert_eq!(fs.command.as_deref(), Some("npx"));
    assert_eq!(fs.args, vec!["-y", "@mcp/fs"]);
    assert_eq!(
        fs.env.get("ROOT"),
        Some(&SecretValue::Inline("/data".into()))
    );
}

#[test]
fn sharing_missing_mcp_errors() {
    let res = share_mcp(&ClaudeAdapter, "{}", &CodexAdapter, "", "nope");
    assert!(res.is_err());
}
