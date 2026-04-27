#!/usr/bin/env python3
"""
MCP Protocol — Neon Topology visualization
Output: public/images/mcp-concept.png
1920×1080, Vibe Coding palette — viewer-first layout
"""

from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1920, 1080
BG      = (0, 0, 0)
GREEN   = (124, 255, 178)
YELLOW  = (255, 209, 102)
WHITE   = (255, 255, 255)
MUTED   = (120, 120, 120)
DIM     = (40, 40, 40)

PINGFANG = "/System/Library/Fonts/STHeiti Medium.ttc"
COURIER  = "/System/Library/Fonts/Supplemental/Courier New.ttf"
COURIER_B= "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"

def font(path, size):
    try: return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

f_zh_title = font(PINGFANG, 52)
f_zh_med   = font(PINGFANG, 32)
f_zh_sm    = font(PINGFANG, 24)
f_en_bold  = font(COURIER_B, 28)
f_en_med   = font(COURIER_B, 22)
f_en_sm    = font(COURIER, 18)
f_en_xs    = font(COURIER, 15)

# ── helpers ──────────────────────────────────────────────────

def glow_line(img, p1, p2, color, width=3, steps=6):
    for i in range(steps, 0, -1):
        layer = Image.new("RGBA", img.size, (0,0,0,0))
        d = ImageDraw.Draw(layer)
        a = int(55 * (i/steps)**1.8)
        d.line([p1, p2], fill=(*color, a), width=width + i*5)
        img = Image.alpha_composite(img, layer)
    core = Image.new("RGBA", img.size, (0,0,0,0))
    d = ImageDraw.Draw(core)
    d.line([p1, p2], fill=(*color, 210), width=width)
    return Image.alpha_composite(img, core)

def glow_circle(img, cx, cy, r, color, width=2, steps=4, fill=None):
    for i in range(steps, 0, -1):
        layer = Image.new("RGBA", img.size, (0,0,0,0))
        d = ImageDraw.Draw(layer)
        a = int(45 * (i/steps)**2)
        rr = r + i*5
        d.ellipse([cx-rr,cy-rr,cx+rr,cy+rr], outline=(*color,a), width=width+i*2)
        img = Image.alpha_composite(img, layer)
    ring = Image.new("RGBA", img.size, (0,0,0,0))
    d = ImageDraw.Draw(ring)
    if fill:
        d.ellipse([cx-r,cy-r,cx+r,cy+r], fill=(*fill,255), outline=(*color,220), width=width)
    else:
        d.ellipse([cx-r,cy-r,cx+r,cy+r], outline=(*color,220), width=width)
    return Image.alpha_composite(img, ring)

def arrow_along(img, p1, p2, t=0.58, size=12, color=GREEN):
    dx = p2[0]-p1[0]; dy = p2[1]-p1[1]
    dist = math.hypot(dx,dy)
    if dist == 0: return img
    ux,uy = dx/dist, dy/dist
    px,py = -uy, ux
    mx = p1[0]+dx*t; my = p1[1]+dy*t
    tip   = (mx+ux*size,     my+uy*size)
    left  = (mx-ux*size*.5+px*size*.6, my-uy*size*.5+py*size*.6)
    right = (mx-ux*size*.5-px*size*.6, my-uy*size*.5-py*size*.6)
    layer = Image.new("RGBA", img.size, (0,0,0,0))
    d = ImageDraw.Draw(layer)
    d.polygon([tip,left,right], fill=(*color,200))
    return Image.alpha_composite(img, layer)

def draw_pill(img, cx, cy, w, h, fill, border, text, font, text_color):
    layer = Image.new("RGBA", img.size, (0,0,0,0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([cx-w//2,cy-h//2,cx+w//2,cy+h//2],
                        radius=h//2, fill=(*fill,230), outline=(*border,200), width=2)
    d.text((cx,cy), text, font=font, fill=(*text_color,240), anchor="mm")
    return Image.alpha_composite(img, layer)

# ── layout ───────────────────────────────────────────────────
#
#  TITLE (top)
#
#  [Claude]  ────────────►  [MCP Server]  ──►  ● File System
#                                          ──►  ● Database
#                                          ──►  ● Web Search
#                                          ──►  ● GitHub
#                                          ──►  ● Custom API
#
#  subtitle row (bottom)

CLAUDE = (340, 540)
MCP    = (820, 540)

TOOLS = [
    (1340, 280),
    (1340, 430),
    (1340, 540),
    (1340, 650),
    (1340, 800),
]
TOOL_EN  = ["File System",  "Database",  "Web Search",  "GitHub",   "Custom API"]
TOOL_ZH  = ["檔案系統",      "資料庫",     "網路搜尋",    "程式倉庫",   "自訂 API"]
TOOL_DESC= ["read / write", "query",     "fetch",       "repos",    "REST / GraphQL"]

# ── base ─────────────────────────────────────────────────────
img = Image.new("RGBA", (W, H), (*BG, 255))

# subtle dot grid
grid = Image.new("RGBA", (W, H), (0,0,0,0))
gd = ImageDraw.Draw(grid)
for x in range(60, W, 72):
    for y in range(60, H, 72):
        gd.ellipse([x-1,y-1,x+1,y+1], fill=(255,255,255,18))
img = Image.alpha_composite(img, grid)

# ── connections ───────────────────────────────────────────────
img = glow_line(img, CLAUDE, MCP, GREEN, width=3, steps=7)
img = arrow_along(img, CLAUDE, MCP, t=0.56, size=14, color=GREEN)

for tp in TOOLS:
    img = glow_line(img, MCP, tp, GREEN, width=2, steps=5)
    img = arrow_along(img, MCP, tp, t=0.62, size=11, color=GREEN)

# protocol label on Claude→MCP line
proto_layer = Image.new("RGBA", (W, H), (0,0,0,0))
pd = ImageDraw.Draw(proto_layer)
mid_x = (CLAUDE[0]+MCP[0])//2
mid_y = CLAUDE[1] - 46
pd.text((mid_x, mid_y), "Model Context Protocol", font=f_en_sm,
        fill=(*GREEN, 140), anchor="mm")
img = Image.alpha_composite(img, proto_layer)

# ── MCP server box ────────────────────────────────────────────
img = draw_pill(img, MCP[0], MCP[1], 200, 72,
                fill=(12,35,22), border=GREEN,
                text="MCP Server", font=f_en_bold, text_color=GREEN)

# ── Claude node ───────────────────────────────────────────────
img = glow_circle(img, *CLAUDE, 68, GREEN, width=2, steps=5, fill=(6,20,12))
img = glow_circle(img, *CLAUDE, 50, GREEN, width=1, steps=3)
# inner AI symbol — two concentric rings
img = glow_circle(img, *CLAUDE, 22, GREEN, width=2, steps=2)

# Claude label block
cl_layer = Image.new("RGBA", (W, H), (0,0,0,0))
cd = ImageDraw.Draw(cl_layer)
cd.text((CLAUDE[0], CLAUDE[1]), "Claude", font=f_en_bold,
        fill=(*GREEN,250), anchor="mm")
cd.text((CLAUDE[0], CLAUDE[1]+36), "AI 模型", font=f_zh_sm,
        fill=(*GREEN,150), anchor="mm")
img = Image.alpha_composite(img, cl_layer)

# ── Tool nodes ────────────────────────────────────────────────
for i, (tp, en, zh, desc) in enumerate(zip(TOOLS, TOOL_EN, TOOL_ZH, TOOL_DESC)):
    tx, ty = tp
    img = glow_circle(img, tx, ty, 28, YELLOW, width=2, steps=3, fill=(22,17,4))
    # dot center
    dot = Image.new("RGBA", (W,H), (0,0,0,0))
    dd = ImageDraw.Draw(dot)
    dd.ellipse([tx-7,ty-7,tx+7,ty+7], fill=(*YELLOW,220))
    img = Image.alpha_composite(img, dot)

    # label to the right
    tl = Image.new("RGBA", (W,H), (0,0,0,0))
    td2 = ImageDraw.Draw(tl)
    # EN name
    td2.text((tx+52, ty-10), en, font=f_en_med, fill=(*YELLOW,240), anchor="lm")
    # ZH sub
    td2.text((tx+52, ty+14), zh, font=f_zh_sm,  fill=(*YELLOW,160), anchor="lm")
    # desc
    td2.text((tx+52, ty+36), desc, font=f_en_xs, fill=(*MUTED,160),  anchor="lm")
    img = Image.alpha_composite(img, tl)

# ── title block ───────────────────────────────────────────────
title_layer = Image.new("RGBA", (W,H), (0,0,0,0))
ttd = ImageDraw.Draw(title_layer)

# accent bar
ttd.rectangle([80, 62, 86, 128], fill=(*GREEN, 220))

ttd.text((104, 72),  "MCP 協議架構",          font=f_zh_title, fill=(*WHITE,230), anchor="lt")
ttd.text((104, 134), "Model Context Protocol · AI 工具整合層",
         font=f_en_sm, fill=(*MUTED,180), anchor="lt")
img = Image.alpha_composite(img, title_layer)

# ── bottom legend ─────────────────────────────────────────────
leg = Image.new("RGBA", (W,H), (0,0,0,0))
ld = ImageDraw.Draw(leg)

# legend row
lx, ly = 80, H-52
# green dot
ld.ellipse([lx,ly-7,lx+14,ly+7], fill=(*GREEN,200))
ld.text((lx+24, ly), "AI 模型 / MCP 伺服器", font=f_en_xs, fill=(*GREEN,180), anchor="lm")
# yellow dot
lx2 = lx + 240
ld.ellipse([lx2,ly-7,lx2+14,ly+7], fill=(*YELLOW,200))
ld.text((lx2+24, ly), "外部工具 / 資源", font=f_en_xs, fill=(*YELLOW,180), anchor="lm")
# right stamp
ld.text((W-48, ly), "article-video · Neon Topology", font=f_en_xs, fill=(*DIM,160), anchor="rm")
img = Image.alpha_composite(img, leg)

# ── save ─────────────────────────────────────────────────────
out = img.convert("RGB")
out_path = os.path.join(os.path.dirname(__file__), "mcp-concept.png")
out.save(out_path, "PNG", quality=95)
print(f"Saved: {out_path}  ({W}×{H})")
