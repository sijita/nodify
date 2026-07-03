# Secretos: passthrough enmascarado, sin bóveda propia en el MVP

Los archivos de config de los agentes ya contienen secretos en texto plano (API keys
de MCP y de proveedores). Nodify los lee/escribe tal cual (passthrough), los muestra
**enmascarados** por defecto en la UI y permite editarlos. No hay bóveda cifrada
propia en el MVP — sería un mini "source of truth" de secretos que contradice el
modelo editor-in-place (ver ADR-0002).

Encima se ofrece una vista de **Proveedores/Secretos** que permite definir una clave
una sola vez y **propagarla** a los MCPs/agentes que la usan (sigue escribiendo el
valor plano donde toca). La bóveda cifrada / keychain del SO se deja para fase 2.

Restricción de seguridad: Nodify no debe empeorar la exposición existente — sin
secretos en logs, sin telemetría de valores, enmascarado por defecto.

Distinción de dominio: **secreto de MCP** (clave que necesita un servidor MCP) vs
**API key de proveedor** (credencial del LLM del propio agente). Son cosas distintas
aunque se gestionen con el mismo mecanismo.
