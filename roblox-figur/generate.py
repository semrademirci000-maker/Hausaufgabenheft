"""Erzeugt ein 3D-Druck-Modell des Roblox-Avatars (R6, blaue Hoodie, schwarze Emo-Haare,
Katzenohren, Kopfhoerer, Baeren-Maske, schwarze Cargo-Hose, blau/weisse Sneaker).

Masseinheit beim Bauen: Roblox-"Studs". Am Ende wird auf die Groesse einer
offiziellen Roblox-Spielfigur (~6,5 cm hoch) skaliert und in Millimetern exportiert.

Aufruf:  python3 generate.py [hoehe_in_mm]
"""
import math
import os
import sys

import numpy as np
import manifold3d as mf
import trimesh

M = mf.Manifold
CS = mf.CrossSection
SEG = 48
TARGET_HEIGHT_MM = float(sys.argv[1]) if len(sys.argv) > 1 else 65.0
OUT = os.path.dirname(os.path.abspath(__file__))

# Koordinaten: x = rechts (aus Sicht des Betrachters), y = nach hinten, z = oben.
# Die Figur schaut also in Richtung -y.


def box(x0, x1, y0, y1, z0, z1):
    return M.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0])


def ellipsoid(c, r):
    return M.sphere(1.0, SEG).scale(list(r)).translate(list(c))


def rot_to(direction):
    """3x3-Rotationsmatrix, die +z auf `direction` dreht."""
    d = np.asarray(direction, float)
    d /= np.linalg.norm(d)
    z = np.array([0.0, 0.0, 1.0])
    v = np.cross(z, d)
    c = float(np.dot(z, d))
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


def spike(base, direction, length, radius, segs=8):
    """Haarstraehne/Spike: Kegel ab `base` in Richtung `direction`."""
    cone = M.cylinder(length, radius, 0.0, segs)
    R = rot_to(direction)
    mat = np.hstack([R, np.asarray(base, float).reshape(3, 1)])
    return cone.transform(mat.tolist())


def rounded_head(radius, height, fillet, z0):
    """Klassischer Roblox-Kopf: Zylinder mit abgerundeten Kanten (Rotationskoerper)."""
    prof = CS.square([radius - fillet, height - 2 * fillet]).translate([0, fillet])
    prof = prof + CS.square([radius - fillet, height]).translate([0, 0])
    prof = prof + CS.square([radius, height - 2 * fillet]).translate([0, fillet])
    prof = prof + CS.circle(fillet, 24).translate([radius - fillet, fillet])
    prof = prof + CS.circle(fillet, 24).translate([radius - fillet, height - fillet])
    return M.revolve(prof, SEG).translate([0, 0, z0])


def ring(center, r, tube, axis="y"):
    prof = CS.circle(tube, 16).translate([r, 0])
    t = M.revolve(prof, 32)  # liegt in der xy-Ebene (Achse z)
    if axis == "y":
        t = t.rotate([90, 0, 0])
    elif axis == "x":
        t = t.rotate([0, 90, 0])
    return t.translate(list(center))


def on_back(cs, center, depth=0.04):
    """2D-Form erhaben auf eine Rueckseite (Flaeche y = center[1]) setzen.
    Von hinten gesehen zeigt die 2D-x-Achse nach rechts (= -x im Modell)."""
    solid = cs.extrude(depth + 0.02)
    mat = [[-1, 0, 0, center[0]], [0, 0, 1, center[1] - 0.02], [0, 1, 0, center[2]]]
    return solid.transform(mat)


def text_shape(text, height):
    """Text als 2D-Querschnitt (zentriert), Hoehe der Grossbuchstaben = height."""
    from matplotlib.textpath import TextPath
    from matplotlib.font_manager import FontProperties
    tp = TextPath((0, 0), text, size=1.0, prop=FontProperties(family="DejaVu Sans", weight="bold"))
    polys = [p for p in tp.to_polygons() if len(p) >= 3]
    cs = CS([p.tolist() for p in polys], mf.FillRule.EvenOdd)
    b = cs.bounds()
    k = height / (b[3] - b[1])
    return cs.translate([-(b[0] + b[2]) / 2, -(b[1] + b[3]) / 2]).scale([k, k])


def rbox(x0, x1, y0, y1, z0, z1, r=0.06):
    """Quader mit abgerundeten Kanten (wirkt weicher/realistischer)."""
    pts = [M.sphere(r, 12).translate([x, y, z])
           for x in (x0 + r, x1 - r) for y in (y0 + r, y1 - r) for z in (z0 + r, z1 - r)]
    return M.batch_hull(pts)


def union(parts):
    return M.batch_boolean(parts, mf.OpType.Add) if len(parts) > 1 else parts[0]


# ---------------------------------------------------------------- Masse (Studs)
HEAD_R, HEAD_H, HEAD_Z0 = 0.62, 1.2, 4.05
HEAD_ZC = HEAD_Z0 + HEAD_H / 2  # 4.65

# ---------------------------------------------------------------- Haut
skin = [
    rounded_head(HEAD_R, HEAD_H, 0.2, HEAD_Z0),
    M.cylinder(0.3, 0.32, 0.32, SEG).translate([0, 0, 3.92]),  # Hals
]


def ribbed(x0, x1, y0, y1, z0, z1, r=0.04, step=0.12, depth=0.025, width=0.045):
    """Gerippter Buendchen-Streifen (Strick-Optik) mit senkrechten Rillen."""
    b = rbox(x0, x1, y0, y1, z0, z1, r)
    cuts = []
    for x in np.arange(x0 + step / 2, x1 - step / 4, step):
        cuts.append(box(x - width / 2, x + width / 2, y0 - 0.1, y0 + depth, z0 - 0.1, z1 + 0.1))
        cuts.append(box(x - width / 2, x + width / 2, y1 - depth, y1 + 0.1, z0 - 0.1, z1 + 0.1))
    for y in np.arange(y0 + step / 2, y1 - step / 4, step):
        cuts.append(box(x0 - 0.1, x0 + depth, y - width / 2, y + width / 2, z0 - 0.1, z1 + 0.1))
        cuts.append(box(x1 - depth, x1 + 0.1, y - width / 2, y + width / 2, z0 - 0.1, z1 + 0.1))
    return b - union(cuts)


def fold(p0, p1, r):
    """Stofffalte: flache, laengliche Wulst zwischen zwei Punkten."""
    return M.batch_hull([M.sphere(r, 12).translate(p0), M.sphere(r * 0.5, 12).translate(p1)])


# ---------------------------------------------------------------- Hoodie (blau)
hoodie = [
    rbox(-1, 1, -0.5, 0.5, 2.15, 4.0, 0.07),                  # Torso
    ribbed(-1.03, 1.03, -0.53, 0.53, 2.0, 2.24),              # gerippter Saum
    # Stoff, der ueber dem Saum leicht "aufbauscht"
    rbox(-1.02, 1.02, -0.52, 0.52, 2.2, 2.42, 0.08),
    # Kragen / Halsausschnitt
    (M.cylinder(0.14, 0.52, 0.52, SEG) - M.cylinder(0.14, 0.3, 0.3, SEG)).translate([0, 0.02, 3.95]),
]
for sx in (-1, 1):
    xa, xb = (1.0, 2.0) if sx > 0 else (-2.0, -1.0)
    hoodie += [
        rbox(xa, xb, -0.5, 0.5, 2.22, 4.0, 0.09),            # Aermel
        ribbed(xa - 0.03 * (sx < 0) + 0.0, xb + 0.03 * (sx > 0), -0.53, 0.53, 2.0, 2.27),  # Buendchen
        rbox(xa + 0.01, xb + 0.0, -0.52, 0.52, 2.24, 2.46, 0.08),  # Stoffstau ueber Buendchen
    ]
    xo = 2.0 if sx > 0 else -2.0                              # Aussenseite des Aermels
    for z0, z1, dz in ((3.0, 2.8, 0.1), (2.75, 2.6, 0.08), (3.35, 3.2, 0.06)):
        hoodie.append(fold([xo, -0.25, z0], [xo, 0.2, z1], 0.05))  # Falten aussen
        hoodie.append(fold([xo - sx * 0.7, -0.5, z0 + dz], [xo - sx * 0.2, -0.5, z1 + dz], 0.045))  # vorne
# Falten am Bauch (leicht schraeg, wie bei echtem Stoff)
for (x0, z0, x1, z1) in ((-0.7, 2.75, -0.2, 2.6), (0.25, 2.62, 0.75, 2.78), (-0.4, 3.15, 0.1, 3.05)):
    hoodie.append(fold([x0, -0.5, z0], [x1, -0.5, z1], 0.045))

# ---------------------------------------------------------------- Hose (schwarz)
pants = []
pocket_bits = []  # graue Druckknoepfe
for sx in (-1, 1):
    x0, x1 = (0.0, 1.0) if sx > 0 else (-1.0, 0.0)
    pants += [
        rbox(x0 + 0.005, x1 - 0.005, -0.5, 0.5, 0.42, 2.05, 0.06),          # Hosenbein
        rbox(x0 - 0.01 * (sx < 0) + 0.0, x1 + 0.01 * (sx > 0), -0.53, 0.53, 0.4, 0.66, 0.08),  # Stau am Saum
    ]
    xo = x1 if sx > 0 else x0
    # Cargo-Tasche mit Klappe an der Aussenseite
    pants.append(rbox(xo - 0.05 if sx > 0 else xo - 0.03, xo + 0.03 if sx > 0 else xo + 0.05, -0.3, 0.3, 0.78, 1.32, 0.03))
    pants.append(rbox(xo - 0.05 if sx > 0 else xo - 0.06, xo + 0.06 if sx > 0 else xo + 0.05, -0.33, 0.33, 1.22, 1.4, 0.03))
    pocket_bits.append(M.cylinder(0.04, 0.045, 0.045, 16).rotate([0, 90, 0]).translate([xo + (0.05 if sx > 0 else -0.09), 0, 1.28]))
    # Knie-Falten vorne
    for z, tilt in ((0.95, 0.05), (0.82, -0.04), (0.72, 0.03)):
        pants.append(fold([x0 + 0.15, -0.5, z + tilt], [x1 - 0.15, -0.5, z - tilt], 0.045))
    # hintere Tasche (leicht erhaben) fuer das Hufeisen-Logo
    pants.append(rbox(-sx * -0.5 - 0.3, -sx * -0.5 + 0.3, 0.48, 0.53, 1.0, 1.58, 0.02))
# Mittelnaht / Schritt vorne als Rille
pants_cut = box(-0.02, 0.02, -0.6, -0.46, 0.3, 1.45)
straps = [  # graue Riemen mit Reissverschluss vorne auf der Hose
    rbox(-0.9, -0.15, -0.55, -0.48, 1.22, 1.3, 0.02),
    rbox(-0.9, -0.15, -0.55, -0.48, 1.05, 1.13, 0.02),
    rbox(0.15, 0.9, -0.55, -0.48, 1.22, 1.3, 0.02),
    rbox(0.15, 0.9, -0.55, -0.48, 1.05, 1.13, 0.02),
] + pocket_bits

# ---------------------------------------------------------------- Sneaker (weiss/blau)
uppers, mudguards, midsoles, outsoles, laces = [], [], [], [], []
for x0, x1 in ((-1.0, 0.0), (0.0, 1.0)):
    xc, w = (x0 + x1) / 2, (x1 - x0) / 2 - 0.04
    # Schaft + abgerundete Schuhspitze
    upper = M.batch_hull([
        rbox(xc - w, xc + w, -0.3, 0.5, 0.12, 0.6, 0.1),
        ellipsoid([xc, -0.55, 0.2], [w * 0.95, 0.18, 0.12]),
    ])
    uppers.append(upper)
    # blaue Lack-Kappe unten rundherum (wie beim Avatar)
    mudguards.append(M.batch_hull([
        rbox(xc - w - 0.02, xc + w + 0.02, -0.3, 0.52, 0.12, 0.3, 0.06),
        ellipsoid([xc, -0.56, 0.2], [w * 0.97 + 0.02, 0.19, 0.1]),
    ]))
    # Zwischensohle (weiss) und Laufsohle (grau, leicht durchsichtig beim Original)
    midsoles.append(M.batch_hull([
        rbox(xc - w - 0.03, xc + w + 0.03, -0.3, 0.55, 0.05, 0.16, 0.04),
        ellipsoid([xc, -0.6, 0.11], [w + 0.03, 0.17, 0.06]),
    ]))
    outsoles.append(M.batch_hull([
        rbox(xc - w - 0.02, xc + w + 0.02, -0.3, 0.54, 0.0, 0.07, 0.02),
        ellipsoid([xc, -0.6, 0.05], [w + 0.02, 0.16, 0.05]),
    ]) ^ box(-2, 2, -2, 2, 0, 0.07))
    # Schnuersenkel auf dem Spann
    for i, (y, z) in enumerate(((-0.52, 0.37), (-0.6, 0.33))):
        laces.append(rbox(xc - 0.22, xc + 0.22, y - 0.03, y + 0.03, z - 0.03, z + 0.03, 0.02))
    # Fersenlasche hinten
    uppers.append(rbox(xc - 0.12, xc + 0.12, 0.47, 0.56, 0.3, 0.6, 0.03))

# ---------------------------------------------------------------- Schluesselanhaenger
key_ring = [ring([0.72, -0.53, 1.82], 0.1, 0.045)]
key_plate = [rbox(0.56, 0.9, -0.6, -0.5, 1.28, 1.74, 0.03)]
key_letter = [  # erhabenes "R"
    box(0.62, 0.68, -0.64, -0.58, 1.34, 1.66),
    box(0.62, 0.82, -0.64, -0.58, 1.6, 1.66),
    box(0.62, 0.82, -0.64, -0.58, 1.48, 1.54),
    box(0.78, 0.84, -0.64, -0.58, 1.5, 1.66),
    spike([0.7, -0.6, 1.5], [1, 0, -1], 0.22, 0.04, 6),
]

# ---------------------------------------------------------------- Maske + Baerenschnauze
big_head = rounded_head(HEAD_R + 0.04, HEAD_H - 0.1, 0.2, HEAD_Z0 + 0.05)
mask = [big_head ^ box(-1, 1, -1, 0.1, HEAD_Z0 + 0.14, HEAD_Z0 + 0.6)]
# Ohrschlaufen der Maske (laufen unter die Kopfhoerer)
for sx in (-1, 1):
    mask.append(fold([sx * 0.5, -0.38, HEAD_Z0 + 0.52], [sx * 0.66, 0.0, HEAD_Z0 + 0.58], 0.035))
    mask.append(fold([sx * 0.5, -0.38, HEAD_Z0 + 0.2], [sx * 0.66, 0.0, HEAD_Z0 + 0.5], 0.035))
muzzle = [ellipsoid([0, -0.64, 4.4], [0.24, 0.1, 0.17])]
nose = [ellipsoid([0, -0.735, 4.47], [0.09, 0.05, 0.055])]
mouth = [
    box(-0.022, 0.022, -0.76, -0.71, 4.32, 4.44),
    spike([0, -0.725, 4.33], [1, -0.2, -0.8], 0.13, 0.03, 6),
    spike([0, -0.725, 4.33], [-1, -0.2, -0.8], 0.13, 0.03, 6),
]

# ---------------------------------------------------------------- Haare (schwarz)
hair_shell = rounded_head(HEAD_R + 0.08, HEAD_H + 0.12, 0.28, HEAD_Z0 - 0.02)
hair_keep = union([
    box(-1, 1, -1, 1, HEAD_ZC + 0.32, 6),          # oben
    box(-1, 1, -0.05, 1, HEAD_Z0 + 0.05, 6),       # hinten
    box(-1, -0.42, -1, 1, HEAD_ZC - 0.05, 6),      # Seiten
    box(0.42, 1, -1, 1, HEAD_ZC - 0.05, 6),
])
hair = [hair_shell ^ hair_keep]

rng = np.random.default_rng(7)
top = HEAD_Z0 + HEAD_H


def lock(base, d1, d2, length, r):
    """Gebogene Haarstraehne: dick am Ansatz, knickt in der Mitte ab, spitz am Ende."""
    b = np.asarray(base, float)
    d1 = np.asarray(d1, float) / np.linalg.norm(d1)
    d2 = np.asarray(d2, float) / np.linalg.norm(d2)
    mid = b + d1 * length * 0.5
    tip = mid + d2 * length * 0.5
    seg1 = M.batch_hull([M.sphere(r, 12).translate(b.tolist()), M.sphere(r * 0.65, 12).translate(mid.tolist())])
    seg2 = M.batch_hull([M.sphere(r * 0.65, 12).translate(mid.tolist()), M.sphere(0.015, 6).translate(tip.tolist())])
    return seg1 + seg2


# Straehnen rund um Hinterkopf und Seiten (zwei Lagen)
for layer, (n, zlo, zhi, ln) in enumerate(((26, -0.1, 0.25, (0.3, 0.48)), (22, 0.2, 0.5, (0.28, 0.42)))):
    for i in range(n):
        a = math.radians(-25 + i * (230 / (n - 1)) + layer * 5 + rng.uniform(-3, 3))
        zb = HEAD_ZC + rng.uniform(zlo, zhi)
        r = HEAD_R + 0.03
        base = [r * math.cos(a), max(-0.32, r * math.sin(a)), zb]
        out = np.array([math.cos(a), math.sin(a) * 1.2, 0.0])
        d1 = out + [0, 0, rng.uniform(-0.3, 0.2)]
        d2 = out * 0.6 + [0, 0, rng.uniform(-1.0, -0.5)]
        hair.append(lock(base, d1, d2, rng.uniform(*ln), rng.uniform(0.08, 0.12)))
# Straehnen oben (stehen zerzaust ab)
for i in range(14):
    a = math.radians(i * (360 / 14) + rng.uniform(-8, 8))
    rr = rng.uniform(0.15, 0.42)
    base = [rr * math.cos(a), rr * math.sin(a) + 0.05, top - 0.03]
    d1 = [math.cos(a) * 0.6, math.sin(a) * 0.6, 1.0]
    d2 = [math.cos(a), math.sin(a), rng.uniform(-0.2, 0.4)]
    hair.append(lock(base, d1, d2, rng.uniform(0.3, 0.45), rng.uniform(0.09, 0.13)))
# Pony vorne: seitlich ueber die Augen gekaemmt, gebogen
for i, x in enumerate(np.linspace(-0.52, 0.5, 11)):
    base = [x, -0.48, top - 0.1]
    d1 = [0.3, -0.7, -0.4]
    d2 = [0.25 + 0.1 * (i % 3), -0.15, -1.0]
    hair.append(lock(base, d1, d2, rng.uniform(0.55, 0.7), rng.uniform(0.08, 0.1)))
# Katzenohren (weich gerundet, mit Vertiefung innen)
for sx in (-1, 1):
    tip = [sx * 0.6, -0.06, top + 0.5]
    ear = M.batch_hull([
        M.sphere(0.06, 12).translate([sx * 0.15, -0.12, top - 0.05]),
        M.sphere(0.06, 12).translate([sx * 0.55, -0.12, top - 0.1]),
        M.sphere(0.06, 12).translate([sx * 0.35, 0.12, top - 0.05]),
        M.sphere(0.025, 8).translate(tip),
    ])
    inner = M.batch_hull([
        M.sphere(0.03, 8).translate([sx * 0.25, -0.22, top + 0.02]),
        M.sphere(0.03, 8).translate([sx * 0.48, -0.22, top - 0.0]),
        M.sphere(0.015, 6).translate([sx * 0.56, -0.15, top + 0.36]),
    ])
    hair.append(ear - inner)

# ---------------------------------------------------------------- Kopfhoerer (grau)
cup_z, cup_y = HEAD_ZC + 0.02, 0.0
headphones = []
cup_prof = (CS.square([0.24, 0.2]) + CS.square([0.3, 0.12]).translate([0, 0.04])
            + CS.circle(0.06, 16).translate([0.24, 0.04]) + CS.circle(0.06, 16).translate([0.24, 0.16]))
cup_shape = M.revolve(cup_prof, SEG)                       # Muschel mit runder Kante
pad = M.revolve(CS.circle(0.06, 16).translate([0.2, 0]), SEG)  # Polster-Ring
for sx in (-1, 1):
    c = (cup_shape + pad.translate([0, 0, 0.0])).rotate([0, 90 * sx, 0])
    headphones.append(c.translate([sx * (HEAD_R + 0.08), cup_y, cup_z]))
    headphones.append(M.cylinder(0.05, 0.16, 0.13, SEG).rotate([0, 90 * sx, 0])
                      .translate([sx * (HEAD_R + 0.28), cup_y, cup_z]))      # Deckel
# Fuellkoerper zwischen Kopf und Muschel (verhindert Hohlraeume im Druck)
headphones.append(M.cylinder(1.6, 0.26, 0.26, SEG).rotate([0, 90, 0]).translate([-0.8, cup_y, cup_z]))
band = (M.cylinder(0.14, 0.92, 0.92, 64) - M.cylinder(0.14, 0.82, 0.82, 64)).rotate([90, 0, 0])
band = band.translate([0, cup_y + 0.07, cup_z]) ^ box(-1, 1, -1, 1, cup_z + 0.2, 7)
headphones.append(band)
# Polster unter dem Buegel oben
cushion = (M.cylinder(0.18, 0.84, 0.84, 64) - M.cylinder(0.18, 0.76, 0.76, 64)).rotate([90, 0, 0])
headphones.append(cushion.translate([0, cup_y + 0.09, cup_z]) ^ box(-0.45, 0.45, -1, 1, cup_z + 0.5, 7))
for sx in (-1, 1):  # Gelenk/Schieber zur Muschel
    headphones.append(rbox(sx * 0.87 - 0.05, sx * 0.87 + 0.05, cup_y - 0.07, cup_y + 0.07,
                           cup_z + 0.12, cup_z + 0.5, 0.02))

# ---------------------------------------------------------------- Farben & Prioritaet
COLORS = {
    "schwarz": (25, 25, 28, 255),
    "weiss": (240, 240, 240, 255),
    "grau": (160, 162, 168, 255),
    "blau": (24, 64, 200, 255),
    "haut": (232, 190, 150, 255),
}
# Hoechste Prioritaet zuerst: wo Teile sich ueberlappen, "gewinnt" das obere.
# ---------------------------------------------------------------- Rueckseite
# "SPACE"-Schriftzug hinten auf der Hoodie (leicht schraeg wie auf dem Avatar)
back_print = [on_back(text_shape("SPACE", 0.3).rotate(8), [0, 0.5, 3.45])]
# Hufeisen-"U" auf den hinteren Hosentaschen
horseshoe = (CS.circle(0.2, 32) - CS.circle(0.13, 32)) ^ CS.square([0.5, 0.25]).translate([-0.25, -0.25])
horseshoe = horseshoe + CS.square([0.07, 0.2]).translate([-0.2, 0]) + CS.square([0.07, 0.2]).translate([0.13, 0])
horseshoe = horseshoe + CS.square([0.13, 0.05]).translate([-0.245, 0.17]) + CS.square([0.13, 0.05]).translate([0.115, 0.17])
back_logos = [on_back(horseshoe, [x, 0.5, 1.3], 0.035) for x in (-0.5, 0.5)]

LAYERS = [
    ("schwarz", nose + mouth),
    ("weiss", muzzle),
    ("grau", headphones + key_ring),
    ("weiss", key_letter),
    ("weiss", back_print + back_logos),
    ("blau", key_plate),
    ("grau", straps),
    ("schwarz", hair),
    ("schwarz", mask),
    ("blau", hoodie),
    ("weiss", laces),
    ("blau", mudguards),
    ("grau", outsoles),
    ("weiss", midsoles + uppers),
    ("schwarz", pants),
    ("haut", skin),
]


def to_trimesh(m, scale, color=None):
    mesh = m.to_mesh()
    v = np.asarray(mesh.vert_properties)[:, :3] * scale
    f = np.asarray(mesh.tri_verts)
    t = trimesh.Trimesh(v, f, process=True)
    if color is not None:
        t.visual.face_colors = color
    return t


def main():
    layer_solids = [(c, union(parts)) for c, parts in LAYERS]
    # Mittelnaht vorne an der Hose als feine Rille
    layer_solids = [(c, s - pants_cut) if s is not None and c == "schwarz" and i == len(LAYERS) - 2 else (c, s)
                    for i, (c, s) in enumerate(layer_solids)]
    whole = union([s for _, s in layer_solids])
    bb = whole.bounding_box()
    height = bb[5] - bb[2]
    scale = TARGET_HEIGHT_MM / height
    shift = [-(bb[0] + bb[3]) / 2, -(bb[1] + bb[4]) / 2, -bb[2]]

    per_color = {}
    taken = None
    for color, solid in layer_solids:
        piece = solid if taken is None else solid - taken
        taken = solid if taken is None else taken + solid
        per_color[color] = piece if color not in per_color else per_color[color] + piece

    os.makedirs(os.path.join(OUT, "mehrfarbig"), exist_ok=True)
    whole_mesh = to_trimesh(whole.translate(shift), scale)
    whole_mesh.export(os.path.join(OUT, "roblox_figur.stl"))

    scene = trimesh.Scene()
    for color, solid in per_color.items():
        tm = to_trimesh(solid.translate(shift), scale, COLORS[color])
        tm.export(os.path.join(OUT, "mehrfarbig", f"figur_{color}.stl"))
        scene.add_geometry(tm, node_name=color, geom_name=color)
    scene.export(os.path.join(OUT, "roblox_figur_farbig.3mf"))
    scene.export(os.path.join(OUT, "roblox_figur_farbig.glb"))

    ext = whole_mesh.extents
    print(f"Masse: {ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} mm (B x T x H)")
    print(f"Wasserdicht: {whole_mesh.is_watertight}, Koerper: {len(whole.decompose())}, "
          f"Volumen: {whole_mesh.volume / 1000:.1f} cm3, 1 Stud = {scale:.2f} mm")


if __name__ == "__main__":
    main()
