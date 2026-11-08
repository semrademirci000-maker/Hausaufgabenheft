"""Erzeugt roblox_figur.usdz aus den Farbteilen in mehrfarbig/.
USDZ kann das iPad/iPhone direkt anzeigen (Dateien-App -> antippen), auch in AR
in Originalgroesse (6,5 cm) auf dem Tisch.

Aufruf: python3 make_usdz.py   (nach generate.py)
"""
import glob
import os

import trimesh
from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdUtils

OUT = os.path.dirname(os.path.abspath(__file__))
COLORS = {
    "schwarz": (0.10, 0.10, 0.11),
    "weiss": (0.94, 0.94, 0.94),
    "grau": (0.63, 0.64, 0.66),
    "blau": (0.09, 0.25, 0.78),
    "haut": (0.91, 0.75, 0.59),
}

usdc = os.path.join(OUT, "_figur.usdc")
stage = Usd.Stage.CreateNew(usdc)
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
UsdGeom.SetStageMetersPerUnit(stage, 0.001)  # Einheiten = Millimeter
root = UsdGeom.Xform.Define(stage, "/Figur")
stage.SetDefaultPrim(root.GetPrim())

for path in sorted(glob.glob(os.path.join(OUT, "mehrfarbig", "figur_*.stl"))):
    name = os.path.basename(path)[6:-4]
    m = trimesh.load(path)
    v = m.vertices[:, [0, 2, 1]] * [1, 1, -1]  # z-oben -> y-oben, Gesicht nach +z
    mesh = UsdGeom.Mesh.Define(stage, f"/Figur/{name}")
    mesh.CreatePointsAttr([Gf.Vec3f(*map(float, p)) for p in v])
    mesh.CreateFaceVertexCountsAttr([3] * len(m.faces))
    mesh.CreateFaceVertexIndicesAttr([int(i) for i in m.faces.flatten()])
    mesh.CreateSubdivisionSchemeAttr("none")

    mat = UsdShade.Material.Define(stage, f"/Figur/mat_{name}")
    sh = UsdShade.Shader.Define(stage, f"/Figur/mat_{name}/pbr")
    sh.CreateIdAttr("UsdPreviewSurface")
    sh.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*COLORS[name]))
    sh.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.6)
    mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), "surface")
    UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(mat)

stage.GetRootLayer().Save()
UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(usdc), os.path.join(OUT, "roblox_figur.usdz"))
os.remove(usdc)
print("roblox_figur.usdz erstellt")
