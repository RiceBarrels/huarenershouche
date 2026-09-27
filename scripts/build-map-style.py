#!/usr/bin/env python3
"""生成常來車網品牌地图样式 public/map-styles/clc-light.json + clc-dark.json

基于 OpenFreeMap positron(浅色)/ dark(深色)样式改造:
- 全部标注字体换成自托管 ZCOOL QingKe HuangYou(public/map-glyphs)
- 配色调成品牌色系(浅灰画布 + 灰绿水系/绿地)
- 标注中文优先(name:zh),无中文时回退拉丁名

用法: python3 scripts/build-map-style.py
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "map-styles"

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

# 深色:深灰画布 + 墨绿水系/绿地;原样式标注过暗(水体名近乎全黑),统一提亮
PLACE_LABEL_DARK = {"text-color": "#9aa39d", "text-halo-color": "rgba(0,0,0,0.75)"}
COLOR_OVERRIDES_DARK = {
    "background": {"background-color": "#151816"},
    "road_area_pier": {"fill-color": "#151816"},
    "road_pier": {"line-color": "#151816"},
    "landcover_ice_shelf": {"fill-color": "#151816"},
    "water": {"fill-color": "#1d2a24"},
    "waterway": {"line-color": "#1d2a24"},
    "landuse_park": {"fill-color": "#1b231e"},
    "landcover_wood": {"fill-color": "#1b231e"},
    # 原样式道路 7% 亮度,在深灰画布上几乎不可见 → 整体提亮一档
    "building": {"fill-color": "#1a1d1b", "fill-outline-color": "#222724"},
    "highway_path": {"line-color": "#262b28"},
    "highway_minor": {"line-color": "#232826"},
    "highway_major_casing": {"line-color": "rgba(90,100,95,0.55)"},
    "highway_major_inner": {"line-color": "#2b322e"},
    "highway_major_subtle": {"line-color": "#2e3531"},
    "highway_motorway_casing": {"line-color": "rgba(100,112,106,0.6)"},
    "highway_motorway_subtle": {"line-color": "#2b322e"},
    "railway": {"line-color": "#2c312e"},
    "railway_minor": {"line-color": "#2c312e"},
    "railway_transit": {"line-color": "#2c312e"},
    "boundary_state": {"line-color": "#3a413d"},
    "water_name": {"text-color": "#6f9a85", "text-halo-color": "rgba(0,0,0,0.7)"},
    "highway_name_other": {"text-color": "#7c837f"},
    "highway_name_motorway": {"text-color": "#8a918d"},
    **{
        layer_id: PLACE_LABEL_DARK
        for layer_id in (
            "place_other", "place_suburb", "place_village", "place_town",
            "place_city", "place_city_large", "place_state",
            "place_country_other", "place_country_minor", "place_country_major",
        )
    },
}

# (输出文件, 源样式, 样式名, 配色覆盖)
VARIANTS = [
    ("clc-light.json", "https://tiles.openfreemap.org/styles/positron", "CLCAuto Light", COLOR_OVERRIDES),
    ("clc-dark.json", "https://tiles.openfreemap.org/styles/dark", "CLCAuto Dark", COLOR_OVERRIDES_DARK),
]

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


def build(out_name: str, source: str, name: str, overrides: dict) -> None:
    raw = subprocess.run(["curl", "-sL", source], capture_output=True, check=True).stdout
    style = json.loads(raw)

    # 运行时把 __ORIGIN__ 替换成 location.origin(字形 PBF 自托管)
    style["glyphs"] = "__ORIGIN__/map-glyphs/{fontstack}/{range}.pbf"
    style["name"] = name

    for layer in style["layers"]:
        layout = layer.get("layout", {})
        if layout.get("text-font"):
            layout["text-font"] = FONT
        if layer["id"] in overrides:
            layer.setdefault("paint", {}).update(overrides[layer["id"]])

        # 标注换成中文优先(shield 类图层显示 ref 编号,不动)
        tf = layout.get("text-field")
        if tf is not None and "name" in json.dumps(tf):
            symbol_placement = layout.get("symbol-placement")
            layout["text-field"] = (
                TEXT_LINE_ZH if symbol_placement == "line" else TEXT_POINT_ZH
            )

    out = OUT_DIR / out_name
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(style, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {out} ({len(style['layers'])} layers)")


def main() -> None:
    for variant in VARIANTS:
        build(*variant)


if __name__ == "__main__":
    main()
