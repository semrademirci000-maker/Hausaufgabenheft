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

# ---------------------------------------------------------------- Hoodie (blau)
hoodie = [
    box(-1, 1, -0.5, 0.5, 2.0, 4.0),                       # Torso
    box(-1.03, 1.03, -0.53, 0.53, 2.0, 2.22),              # Buendchen unten
    box(1.0, 2.0, -0.5, 0.5, 2.0, 4.0),                    # Arm links
    box(-2.0, -1.0, -0.5, 0.5, 2.0, 4.0),                  # Arm rechts
    box(1.0, 2.03, -0.53, 0.53, 2.0, 2.25),                # Aermel-Buendchen
    box(-2.03, -1.0, -0.53, 0.53, 2.0, 2.25),
    # Kragen um den Hals
    (M.cylinder(0.14, 0.52, 0.52, SEG) - M.cylinder(0.14, 0.3, 0.3, SEG)).translate([0, 0.02, 3.97]),
]

# ---------------------------------------------------------------- Hose (schwarz)
pants = [
    box(-1.0, 0.0, -0.5, 0.5, 0.42, 2.0),
    box(0.0, 1.0, -0.5, 0.5, 0.42, 2.0),
    box(1.0, 1.07, -0.3, 0.3, 0.8, 1.35),                  # Cargo-Taschen
    box(-1.07, -1.0, -0.3, 0.3, 0.8, 1.35),
]
straps = [  # graue Riemen/Reissverschluesse vorne auf der Hose
    box(-0.9, -0.15, -0.54, -0.5, 1.22, 1.3),
    box(-0.9, -0.15, -0.54, -0.5, 1.05, 1.13),
    box(0.15, 0.9, -0.54, -0.5, 1.22, 1.3),
    box(0.15, 0.9, -0.54, -0.5, 1.05, 1.13),
]

# ---------------------------------------------------------------- Schuhe
shoes, soles = [], []
for x0, x1 in ((-1.0, 0.0), (0.0, 1.0)):
    shoes.append(box(x0 + 0.03, x1 - 0.03, -0.6, 0.5, 0.1, 0.48))
    soles.append(box(x0 + 0.01, x1 - 0.01, -0.64, 0.52, 0.0, 0.12))
    xo = x1 - 0.05 if x1 > 0 else x0 + 0.01          # blauer Seitenstreifen aussen
    soles.append(box(xo, xo + 0.04, -0.45, 0.3, 0.18, 0.3))

# ---------------------------------------------------------------- Schluesselanhaenger
key_ring = [ring([0.72, -0.53, 1.82], 0.1, 0.045)]
key_plate = [box(0.56, 0.9, -0.6, -0.5, 1.28, 1.74)]
key_letter = [  # erhabenes "R"
    box(0.62, 0.68, -0.64, -0.6, 1.34, 1.66),
    box(0.62, 0.82, -0.64, -0.6, 1.6, 1.66),
    box(0.62, 0.82, -0.64, -0.6, 1.48, 1.54),
    box(0.78, 0.84, -0.64, -0.6, 1.5, 1.66),
    spike([0.7, -0.62, 1.5], [1, 0, -1], 0.22, 0.04, 6),
]

# ---------------------------------------------------------------- Maske + Baerenschnauze
big_head = rounded_head(HEAD_R + 0.04, HEAD_H - 0.1, 0.2, HEAD_Z0 + 0.05)
mask = [big_head ^ box(-1, 1, -1, 0.1, HEAD_Z0 + 0.14, HEAD_Z0 + 0.6)]
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
# Spikes rund um Hinterkopf und Seiten
for i in range(22):
    a = math.radians(-20 + i * (220 / 21))           # Winkel um die Hochachse (0 = rechts)
    zb = HEAD_ZC + rng.uniform(-0.05, 0.45)
    r = HEAD_R + 0.02
    base = [r * math.cos(a), max(-0.3, r * math.sin(a)), zb]
    d = [math.cos(a), math.sin(a) * 1.2, rng.uniform(-0.9, -0.2)]
    hair.append(spike(base, d, rng.uniform(0.32, 0.5), rng.uniform(0.11, 0.16)))
# Spikes oben
for i in range(9):
    a = math.radians(i * 40 + 10)
    base = [0.35 * math.cos(a), 0.35 * math.sin(a), top - 0.02]
    d = [math.cos(a), math.sin(a), rng.uniform(0.3, 0.9)]
    hair.append(spike(base, d, rng.uniform(0.3, 0.45), rng.uniform(0.13, 0.18)))
# Pony vorne (seitlich ueber die Augen gekaemmt)
for i, x in enumerate(np.linspace(-0.5, 0.48, 8)):
    base = [x, -0.5, top - 0.12]
    d = [0.35 + 0.1 * (i % 2), -0.4, -1.0]
    hair.append(spike(base, d, rng.uniform(0.5, 0.62), rng.uniform(0.11, 0.14)))
# Katzenohren
for sx in (-1, 1):
    hair.append(spike([sx * 0.36, -0.02, top - 0.08], [sx * 0.45, -0.05, 1.0], 0.55, 0.26, 4))

# ---------------------------------------------------------------- Kopfhoerer (grau)
cup_z, cup_y = HEAD_ZC + 0.02, 0.0
headphones = []
for sx in (-1, 1):
    cup = M.cylinder(0.2, 0.28, 0.28, SEG).rotate([0, 90, 0])
    headphones.append(cup.translate([sx * (HEAD_R + 0.04) + (0 if sx > 0 else -0.2), cup_y, cup_z]))
band = (M.cylinder(0.14, 0.9, 0.9, 64) - M.cylinder(0.14, 0.8, 0.8, 64)).rotate([90, 0, 0])
band = band.translate([0, cup_y + 0.07, cup_z]) ^ box(-1, 1, -1, 1, cup_z + 0.15, 7)
headphones.append(band)
for sx in (-1, 1):  # Buegel-Verbindung zur Muschel
    headphones.append(box(sx * 0.83 - 0.05, sx * 0.83 + 0.05, cup_y - 0.07, cup_y + 0.07, cup_z + 0.1, cup_z + 0.45))

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
    ("blau", soles),
    ("weiss", shoes),
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
