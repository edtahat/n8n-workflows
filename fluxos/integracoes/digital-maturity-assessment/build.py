#!/usr/bin/env python3
"""Injeta interface.html dentro do workflow n8n (no do 'Serve Interface').

Uso: python3 build.py
Saida: ../digital-maturity-assessment.json (arquivo importavel no n8n)
"""
import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parent
OUT = BASE.parent / "digital-maturity-assessment.json"
PLACEHOLDER = "__INTERFACE_HTML__"


def main() -> None:
    html = (BASE / "interface.html").read_text(encoding="utf-8")
    if "{{" in html:
        raise SystemExit("interface.html contem '{{' e seria avaliado como expressao n8n.")

    workflow = json.loads((BASE / "workflow.template.json").read_text(encoding="utf-8"))
    injected = 0
    for node in workflow["nodes"]:
        if node["parameters"].get("responseBody") == PLACEHOLDER:
            node["parameters"]["responseBody"] = html
            injected += 1
    if injected != 1:
        raise SystemExit(f"esperado 1 placeholder {PLACEHOLDER}, encontrado {injected}")

    OUT.write_text(json.dumps(workflow, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"gerado: {OUT.relative_to(BASE.parent.parent.parent)} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
