#!/usr/bin/env python3
"""Erzeugt das App-Icon (1024x1024, ohne Alpha-Kanal) ohne externe Bibliotheken.

Aufruf:  python3 ios/Tools/make_appicon.py
Ergebnis: ios/Schulplaner/Assets.xcassets/AppIcon.appiconset/AppIcon.png
"""
import os
import struct
import zlib

SS = 2        # Supersampling-Faktor (Kantenglättung)
SIZE = 1024
S = SIZE * SS

buf = bytearray(S * S * 3)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def vertical_gradient(top, bottom):
    for y in range(S):
        color = lerp(top, bottom, y / (S - 1))
        buf[y * S * 3:(y + 1) * S * 3] = bytes(color) * S


def set_pixel(x, y, color):
    if 0 <= x < S and 0 <= y < S:
        i = (y * S + x) * 3
        buf[i] = color[0]
        buf[i + 1] = color[1]
        buf[i + 2] = color[2]


def fill_rect(x0, y0, x1, y1, color):
    row = bytes(color) * max(0, int(x1) - int(x0))
    for y in range(int(y0), int(y1)):
        if 0 <= y < S:
            i = (y * S + int(x0)) * 3
            buf[i:i + len(row)] = row


def fill_round_rect(x0, y0, x1, y1, radius, color):
    x0, y0, x1, y1, radius = map(int, (x0, y0, x1, y1, radius))
    fill_rect(x0 + radius, y0, x1 - radius, y1, color)
    fill_rect(x0, y0 + radius, x0 + radius, y1 - radius, color)
    fill_rect(x1 - radius, y0 + radius, x1, y1 - radius, color)
    corners = ((x0 + radius, y0 + radius), (x1 - radius - 1, y0 + radius),
               (x0 + radius, y1 - radius - 1), (x1 - radius - 1, y1 - radius - 1))
    for cx, cy in corners:
        for y in range(cy - radius, cy + radius + 1):
            for x in range(cx - radius, cx + radius + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                    if not (x0 + radius <= x < x1 - radius) and not (y0 + radius <= y < y1 - radius):
                        set_pixel(x, y, color)


def fill_circle(cx, cy, radius, color):
    cx, cy, radius = int(cx), int(cy), int(radius)
    for y in range(cy - radius, cy + radius + 1):
        dy = y - cy
        span = int((radius ** 2 - dy ** 2) ** 0.5) if abs(dy) <= radius else -1
        if span >= 0:
            fill_rect(cx - span, y, cx + span, y + 1, color)


def u(v):
    """Koordinate im 1024er-Raster in den Supersampling-Raster umrechnen."""
    return v * SS


# --- Motiv: Heftseite mit Linien und blauem Plus – ruhig und klar ---
vertical_gradient((241, 239, 233), (228, 224, 214))

# feiner Schatten unter der Seite
fill_round_rect(u(186), u(178), u(846), u(868), u(52), (206, 201, 190))
# Seite
fill_round_rect(u(178), u(166), u(838), u(856), u(52), (255, 255, 255))

# gedeckte Fach-Balken
for index, (color, width) in enumerate([((59, 111, 209), 236), ((192, 69, 60), 176), ((46, 139, 98), 206)]):
    top = 250 + index * 56
    fill_round_rect(u(246), u(top), u(246 + width), u(top + 26), u(13), color)

# feine dunkle Linien
for index in range(4):
    y = 456 + index * 68
    fill_round_rect(u(246), u(y), u(690), u(y + 7), u(3), (38, 40, 46))

# Akzent: blauer Plus-Knopf
fill_circle(u(716), u(716), u(112), (33, 78, 158))
fill_circle(u(716), u(708), u(112), (39, 105, 212))
fill_round_rect(u(716 - 54), u(708 - 12), u(716 + 54), u(708 + 12), u(12), (255, 255, 255))
fill_round_rect(u(716 - 12), u(708 - 54), u(716 + 12), u(708 + 54), u(12), (255, 255, 255))

# --- Downsampling auf 1024 und PNG schreiben (RGB, kein Alpha) ---
raw = bytearray()
for y in range(SIZE):
    raw.append(0)  # Filter-Byte
    for x in range(SIZE):
        r = g = b = 0
        for dy in range(SS):
            base = ((y * SS + dy) * S + x * SS) * 3
            for dx in range(SS):
                i = base + dx * 3
                r += buf[i]
                g += buf[i + 1]
                b += buf[i + 2]
        count = SS * SS
        raw += bytes((r // count, g // count, b // count))


def chunk(kind, data):
    return (struct.pack(">I", len(data)) + kind + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF))


png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
png += chunk(b"IEND", b"")

target = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "..", "Schulplaner", "Assets.xcassets", "AppIcon.appiconset", "AppIcon.png")
target = os.path.normpath(target)
with open(target, "wb") as handle:
    handle.write(png)
print("geschrieben:", target, len(png), "Bytes")
