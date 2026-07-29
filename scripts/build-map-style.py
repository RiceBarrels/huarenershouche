#!/usr/bin/env python3
"""生成常來車網品牌地图样式 public/map-styles/clc-light.json

基于 OpenFreeMap positron 样式改造:
- 全部标注字体换成自托管 ZCOOL QingKe HuangYou(public/map-glyphs)
- 配色调成品牌色系(浅灰画布 + 灰绿水系/绿地)
- 标注中文优先(name:zh),无中文时回退拉丁名

用法: python3 scripts/build-map-style.py
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "map-styles" / "clc-light.json"
SOURCE_STYLE = "https://tiles.openfreemap.org/styles/positron"

FONT = ["ZCOOL QingKe HuangYou"]

# 品牌化配色:浅灰画布 + 灰绿水系/绿地,城市标签深灰绿
COLOR_OVERRIDES = {
    "background": {"background-color": "#f6f7f4"},
    "road_area_pier": {"fill-color": "#f6f7f4"},
    "road_pier": {"line-color": "#f6f7f4"},
    "park": {"fill-color": "#dfecdb"},
    "water": {"fill-color": "#c8ddd1"},
    "waterway": {"line-color": "#b9d2c5"},
    "landcover_wood": {"fill-color": "#d9e6d7"},
    "water_name_point_label": {"text-color": "#4a7d63"},
    "water_name_line_label": {"text-color": "#4a7d63"},
    "waterway_line_label": {"text-color": "#7da391"},
    "label_village": {"text-color": "#26302a"},
    "label_town": {"text-color": "#26302a"},
    "label_city": {"text-color": "#26302a"},
    "label_city_capital": {"text-color": "#26302a"},
}

# 中文名提取,简体优先、无简体才用繁体:
# 1. name:zh-Hans(明确的简体字段)
# 2. name:zh 分号分隔的第一个变体(OSM 常见 "旧金山;舊金山;三藩市" 格式;
#    实测多变体条目必有 zh-Hans,走到这里的都是单值,简繁未标注时原样用)
# 3. name:zh-Hant(仅存繁体字段时回退繁体)
ZH_NAME = [
    "coalesce",
    ["get", "name:zh-Hans"],
    [
        "case",
        ["has", "name:zh"],
        [
            "let", "zh", ["get", "name:zh"],
            [
                "case",
                [">=", ["index-of", ";", ["var", "zh"]], 0],
                ["slice", ["var", "zh"], 0, ["index-of", ";", ["var", "zh"]]],
                ["var", "zh"],
            ],
        ],
        ["get", "name:zh-Hant"],
    ],
]
HAS_ZH = ["any", ["has", "name:zh-Hans"], ["has", "name:zh"], ["has", "name:zh-Hant"]]
LATIN_FALLBACK = ["coalesce", ["get", "name:latin"], ["get", "name_en"], ["get", "name"]]

# 点状地名(城市/机场/水体点):有中文 → 「中文\n拉丁」双行;否则拉丁
TEXT_POINT_ZH = [
    "case",
    HAS_ZH,
    ["concat", ZH_NAME, "\n", ["get", "name:latin"]],
    LATIN_FALLBACK,
]
# 线状标注(街道/河流):单行,中文优先
TEXT_LINE_ZH = ["case", HAS_ZH, ZH_NAME, LATIN_FALLBACK]


def main() -> None:
    raw = subprocess.run(
        ["curl", "-sL", SOURCE_STYLE], capture_output=True, check=True
    ).stdout
    style = json.loads(raw)

    # 运行时把 __ORIGIN__ 替换成 location.origin(字形 PBF 自托管)
    style["glyphs"] = "__ORIGIN__/map-glyphs/{fontstack}/{range}.pbf"
    style["name"] = "CLCAuto Light"

    for layer in style["layers"]:
        layout = layer.get("layout", {})
        if layout.get("text-font"):
            layout["text-font"] = FONT
        if layer["id"] in COLOR_OVERRIDES:
            layer.setdefault("paint", {}).update(COLOR_OVERRIDES[layer["id"]])

        # 标注换成中文优先(shield 类图层显示 ref 编号,不动)
        tf = layout.get("text-field")
        if tf is not None and "name" in json.dumps(tf):
            symbol_placement = layout.get("symbol-placement")
            layout["text-field"] = (
                TEXT_LINE_ZH if symbol_placement == "line" else TEXT_POINT_ZH
            )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(style, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {OUT} ({len(style['layers'])} layers)")


if __name__ == "__main__":
    main()
