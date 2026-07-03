//! Utilidades compartidas por los adaptadores.

use std::collections::BTreeMap;

use nodify_core::SecretValue;
use serde_json::Value;

/// Serializa un secreto a su forma textual para escribir en config.
/// Una referencia a env var se escribe como `${NAME}` (Claude/OpenCode no interpolan,
/// pero es la representación honesta y no filtra ningún valor).
pub fn secret_to_string(s: &SecretValue) -> String {
    match s {
        SecretValue::Inline(v) => v.clone(),
        SecretValue::EnvRef(name) => format!("${{{name}}}"),
    }
}

/// Convierte un mapa de secretos en un objeto JSON `{ K: "V" }`.
pub fn secret_map_to_json(map: &BTreeMap<String, SecretValue>) -> Value {
    let mut obj = serde_json::Map::new();
    for (k, v) in map {
        obj.insert(k.clone(), Value::String(secret_to_string(v)));
    }
    Value::Object(obj)
}

/// Convierte un objeto JSON `{ "K": "V" }` en un mapa de secretos inline.
/// Valores no-string se serializan a su representación JSON como fallback.
pub fn json_obj_to_inline_map(v: Option<&Value>) -> BTreeMap<String, SecretValue> {
    let mut out = BTreeMap::new();
    if let Some(Value::Object(obj)) = v {
        for (k, val) in obj {
            let s = match val {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            out.insert(k.clone(), SecretValue::Inline(s));
        }
    }
    out
}

/// Convierte un `Value::Array` de strings en `Vec<String>`.
pub fn json_array_to_strings(v: Option<&Value>) -> Vec<String> {
    match v {
        Some(Value::Array(arr)) => arr
            .iter()
            .filter_map(|x| x.as_str().map(str::to_string))
            .collect(),
        _ => Vec::new(),
    }
}
