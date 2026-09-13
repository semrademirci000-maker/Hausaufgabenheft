#!/usr/bin/env python3
"""Erzeugt Schulplaner.xcodeproj/project.pbxproj aus den Dateien in ios/Schulplaner.

Aufruf: python3 ios/Tools/make_xcodeproj.py
Nach dem Hinzufügen neuer Swift-Dateien einfach erneut ausführen
(oder die Datei ganz normal in Xcode hinzufügen).
"""
import hashlib
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
APP = "Schulplaner"
SOURCE_DIR = os.path.join(ROOT, APP)
PROJECT_DIR = os.path.join(ROOT, f"{APP}.xcodeproj")
BUNDLE_ID = "com.beispiel.schulplaner"
DEPLOYMENT_TARGET = "17.0"


def uid(seed):
    return hashlib.md5(seed.encode("utf-8")).hexdigest()[:24].upper()


def swift_files():
    result = []
    for folder, _dirs, files in os.walk(SOURCE_DIR):
        if ".xcassets" in folder:
            continue
        for name in sorted(files):
            if name.endswith(".swift"):
                rel = os.path.relpath(os.path.join(folder, name), SOURCE_DIR)
                result.append(rel.replace(os.sep, "/"))
    return sorted(result)


sources = swift_files()
resources = ["Assets.xcassets"]

file_refs = {}       # pfad -> uid
build_files = {}     # pfad -> uid
for path in sources + resources:
    file_refs[path] = uid("fileref:" + path)
    build_files[path] = uid("buildfile:" + path)

PRODUCT_REF = uid("product")
GROUP_ROOT = uid("group:root")
GROUP_APP = uid("group:app")
GROUP_PRODUCTS = uid("group:products")
TARGET = uid("target")
PROJECT = uid("project")
PHASE_SOURCES = uid("phase:sources")
PHASE_RESOURCES = uid("phase:resources")
PHASE_FRAMEWORKS = uid("phase:frameworks")
LIST_PROJECT = uid("list:project")
LIST_TARGET = uid("list:target")
CONF_PROJECT_DEBUG = uid("conf:project:debug")
CONF_PROJECT_RELEASE = uid("conf:project:release")
CONF_TARGET_DEBUG = uid("conf:target:debug")
CONF_TARGET_RELEASE = uid("conf:target:release")

# Untergruppen (Model, Store, Views …)
subfolders = sorted({os.path.dirname(path) for path in sources if os.path.dirname(path)})
group_ids = {folder: uid("group:" + folder) for folder in subfolders}

out = []
w = out.append

w("// !$*UTF8*$!")
w("{")
w("\tarchiveVersion = 1;")
w("\tclasses = {")
w("\t};")
w("\tobjectVersion = 56;")
w("\tobjects = {")

w("\n/* Begin PBXBuildFile section */")
for path in sources:
    w(f"\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_refs[path]} /* {os.path.basename(path)} */; }};")
for path in resources:
    w(f"\t\t{build_files[path]} /* {path} in Resources */ = {{isa = PBXBuildFile; fileRef = {file_refs[path]} /* {path} */; }};")
w("/* End PBXBuildFile section */")

w("\n/* Begin PBXFileReference section */")
w(f'\t\t{PRODUCT_REF} /* {APP}.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = {APP}.app; sourceTree = BUILT_PRODUCTS_DIR; }};')
for path in sources:
    name = os.path.basename(path)
    w(f'\t\t{file_refs[path]} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {name}; sourceTree = "<group>"; }};')
for path in resources:
    w(f'\t\t{file_refs[path]} /* {path} */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = {path}; sourceTree = "<group>"; }};')
w("/* End PBXFileReference section */")

w("\n/* Begin PBXFrameworksBuildPhase section */")
w(f"\t\t{PHASE_FRAMEWORKS} /* Frameworks */ = {{")
w("\t\t\tisa = PBXFrameworksBuildPhase;")
w("\t\t\tbuildActionMask = 2147483647;")
w("\t\t\tfiles = (")
w("\t\t\t);")
w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
w("\t\t};")
w("/* End PBXFrameworksBuildPhase section */")

w("\n/* Begin PBXGroup section */")
w(f"\t\t{GROUP_ROOT} = {{")
w("\t\t\tisa = PBXGroup;")
w("\t\t\tchildren = (")
w(f"\t\t\t\t{GROUP_APP} /* {APP} */,")
w(f"\t\t\t\t{GROUP_PRODUCTS} /* Products */,")
w("\t\t\t);")
w("\t\t\tsourceTree = \"<group>\";")
w("\t\t};")

w(f"\t\t{GROUP_PRODUCTS} /* Products */ = {{")
w("\t\t\tisa = PBXGroup;")
w("\t\t\tchildren = (")
w(f"\t\t\t\t{PRODUCT_REF} /* {APP}.app */,")
w("\t\t\t);")
w("\t\t\tname = Products;")
w("\t\t\tsourceTree = \"<group>\";")
w("\t\t};")

root_files = [p for p in sources if "/" not in p] + resources
w(f"\t\t{GROUP_APP} /* {APP} */ = {{")
w("\t\t\tisa = PBXGroup;")
w("\t\t\tchildren = (")
for folder in subfolders:
    w(f"\t\t\t\t{group_ids[folder]} /* {folder} */,")
for path in root_files:
    w(f"\t\t\t\t{file_refs[path]} /* {path} */,")
w("\t\t\t);")
w(f"\t\t\tpath = {APP};")
w("\t\t\tsourceTree = \"<group>\";")
w("\t\t};")

for folder in subfolders:
    children = [p for p in sources if os.path.dirname(p) == folder]
    w(f"\t\t{group_ids[folder]} /* {folder} */ = {{")
    w("\t\t\tisa = PBXGroup;")
    w("\t\t\tchildren = (")
    for path in children:
        w(f"\t\t\t\t{file_refs[path]} /* {os.path.basename(path)} */,")
    w("\t\t\t);")
    w(f"\t\t\tpath = {folder};")
    w("\t\t\tsourceTree = \"<group>\";")
    w("\t\t};")
w("/* End PBXGroup section */")

w("\n/* Begin PBXNativeTarget section */")
w(f"\t\t{TARGET} /* {APP} */ = {{")
w("\t\t\tisa = PBXNativeTarget;")
w(f"\t\t\tbuildConfigurationList = {LIST_TARGET} /* Build configuration list for PBXNativeTarget \"{APP}\" */;")
w("\t\t\tbuildPhases = (")
w(f"\t\t\t\t{PHASE_SOURCES} /* Sources */,")
w(f"\t\t\t\t{PHASE_FRAMEWORKS} /* Frameworks */,")
w(f"\t\t\t\t{PHASE_RESOURCES} /* Resources */,")
w("\t\t\t);")
w("\t\t\tbuildRules = (")
w("\t\t\t);")
w("\t\t\tdependencies = (")
w("\t\t\t);")
w(f"\t\t\tname = {APP};")
w(f"\t\t\tproductName = {APP};")
w(f"\t\t\tproductReference = {PRODUCT_REF} /* {APP}.app */;")
w("\t\t\tproductType = \"com.apple.product-type.application\";")
w("\t\t};")
w("/* End PBXNativeTarget section */")

w("\n/* Begin PBXProject section */")
w(f"\t\t{PROJECT} /* Project object */ = {{")
w("\t\t\tisa = PBXProject;")
w("\t\t\tattributes = {")
w("\t\t\t\tBuildIndependentTargetsInParallel = 1;")
w("\t\t\t\tLastSwiftUpdateCheck = 1520;")
w("\t\t\t\tLastUpgradeCheck = 1520;")
w("\t\t\t\tTargetAttributes = {")
w(f"\t\t\t\t\t{TARGET} = {{")
w("\t\t\t\t\t\tCreatedOnToolsVersion = 15.2;")
w("\t\t\t\t\t};")
w("\t\t\t\t};")
w("\t\t\t};")
w(f"\t\t\tbuildConfigurationList = {LIST_PROJECT} /* Build configuration list for PBXProject \"{APP}\" */;")
w("\t\t\tcompatibilityVersion = \"Xcode 14.0\";")
w("\t\t\tdevelopmentRegion = de;")
w("\t\t\thasScannedForEncodings = 0;")
w("\t\t\tknownRegions = (")
w("\t\t\t\tde,")
w("\t\t\t\tBase,")
w("\t\t\t);")
w(f"\t\t\tmainGroup = {GROUP_ROOT};")
w(f"\t\t\tproductRefGroup = {GROUP_PRODUCTS} /* Products */;")
w("\t\t\tprojectDirPath = \"\";")
w("\t\t\tprojectRoot = \"\";")
w("\t\t\ttargets = (")
w(f"\t\t\t\t{TARGET} /* {APP} */,")
w("\t\t\t);")
w("\t\t};")
w("/* End PBXProject section */")

w("\n/* Begin PBXResourcesBuildPhase section */")
w(f"\t\t{PHASE_RESOURCES} /* Resources */ = {{")
w("\t\t\tisa = PBXResourcesBuildPhase;")
w("\t\t\tbuildActionMask = 2147483647;")
w("\t\t\tfiles = (")
for path in resources:
    w(f"\t\t\t\t{build_files[path]} /* {path} in Resources */,")
w("\t\t\t);")
w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
w("\t\t};")
w("/* End PBXResourcesBuildPhase section */")

w("\n/* Begin PBXSourcesBuildPhase section */")
w(f"\t\t{PHASE_SOURCES} /* Sources */ = {{")
w("\t\t\tisa = PBXSourcesBuildPhase;")
w("\t\t\tbuildActionMask = 2147483647;")
w("\t\t\tfiles = (")
for path in sources:
    w(f"\t\t\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */,")
w("\t\t\t);")
w("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
w("\t\t};")
w("/* End PBXSourcesBuildPhase section */")

PROJECT_COMMON = """\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;
\t\t\t\tCLANG_ANALYZER_NONNULL = YES;
\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;
\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;
\t\t\t\tCLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
\t\t\t\tCLANG_WARN_BOOL_CONVERSION = YES;
\t\t\t\tCLANG_WARN_COMMA = YES;
\t\t\t\tCLANG_WARN_CONSTANT_CONVERSION = YES;
\t\t\t\tCLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
\t\t\t\tCLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
\t\t\t\tCLANG_WARN_DOCUMENTATION_COMMENTS = YES;
\t\t\t\tCLANG_WARN_EMPTY_BODY = YES;
\t\t\t\tCLANG_WARN_ENUM_CONVERSION = YES;
\t\t\t\tCLANG_WARN_INFINITE_RECURSION = YES;
\t\t\t\tCLANG_WARN_INT_CONVERSION = YES;
\t\t\t\tCLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
\t\t\t\tCLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
\t\t\t\tCLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
\t\t\t\tCLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
\t\t\t\tCLANG_WARN_STRICT_PROTOTYPES = YES;
\t\t\t\tCLANG_WARN_SUSPICIOUS_MOVE = YES;
\t\t\t\tCLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;
\t\t\t\tCLANG_WARN_UNREACHABLE_CODE = YES;
\t\t\t\tCLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;
\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tGCC_WARN_64_TO_32_BIT_CONVERSION = YES;
\t\t\t\tGCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
\t\t\t\tGCC_WARN_UNDECLARED_SELECTOR = YES;
\t\t\t\tGCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
\t\t\t\tGCC_WARN_UNUSED_FUNCTION = YES;
\t\t\t\tGCC_WARN_UNUSED_VARIABLE = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = %s;
\t\t\t\tLOCALIZATION_PREFERS_STRING_CATALOGS = YES;
\t\t\t\tMTL_FAST_MATH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
""" % DEPLOYMENT_TARGET

TARGET_COMMON = """\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = Schulplaner;
\t\t\t\tINFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
\t\t\t\tINFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents = YES;
\t\t\t\tINFOPLIST_KEY_UILaunchScreen_Generation = YES;
\t\t\t\tINFOPLIST_KEY_UIRequiresFullScreen = NO;
\t\t\t\tINFOPLIST_KEY_UIStatusBarStyle = UIStatusBarStyleDefault;
\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = %s;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
""" % BUNDLE_ID

w("\n/* Begin XCBuildConfiguration section */")
w(f"\t\t{CONF_PROJECT_DEBUG} /* Debug */ = {{")
w("\t\t\tisa = XCBuildConfiguration;")
w("\t\t\tbuildSettings = {")
w(PROJECT_COMMON.rstrip("\n"))
w("\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;")
w("\t\t\t\tENABLE_TESTABILITY = YES;")
w("\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;")
w("\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;")
w("\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = (")
w("\t\t\t\t\t\"DEBUG=1\",")
w("\t\t\t\t\t\"$(inherited)\",")
w("\t\t\t\t);")
w("\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;")
w("\t\t\t\tONLY_ACTIVE_ARCH = YES;")
w("\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = \"DEBUG $(inherited)\";")
w("\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = \"-Onone\";")
w("\t\t\t};")
w("\t\t\tname = Debug;")
w("\t\t};")

w(f"\t\t{CONF_PROJECT_RELEASE} /* Release */ = {{")
w("\t\t\tisa = XCBuildConfiguration;")
w("\t\t\tbuildSettings = {")
w(PROJECT_COMMON.rstrip("\n"))
w("\t\t\t\tDEBUG_INFORMATION_FORMAT = \"dwarf-with-dsym\";")
w("\t\t\t\tENABLE_NS_ASSERTIONS = NO;")
w("\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;")
w("\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;")
w("\t\t\t\tVALIDATE_PRODUCT = YES;")
w("\t\t\t};")
w("\t\t\tname = Release;")
w("\t\t};")

for conf_id, name in ((CONF_TARGET_DEBUG, "Debug"), (CONF_TARGET_RELEASE, "Release")):
    w(f"\t\t{conf_id} /* {name} */ = {{")
    w("\t\t\tisa = XCBuildConfiguration;")
    w("\t\t\tbuildSettings = {")
    w(TARGET_COMMON.rstrip("\n"))
    w("\t\t\t};")
    w(f"\t\t\tname = {name};")
    w("\t\t};")
w("/* End XCBuildConfiguration section */")

w("\n/* Begin XCConfigurationList section */")
w(f"\t\t{LIST_PROJECT} /* Build configuration list for PBXProject \"{APP}\" */ = {{")
w("\t\t\tisa = XCConfigurationList;")
w("\t\t\tbuildConfigurations = (")
w(f"\t\t\t\t{CONF_PROJECT_DEBUG} /* Debug */,")
w(f"\t\t\t\t{CONF_PROJECT_RELEASE} /* Release */,")
w("\t\t\t);")
w("\t\t\tdefaultConfigurationIsVisible = 0;")
w("\t\t\tdefaultConfigurationName = Release;")
w("\t\t};")
w(f"\t\t{LIST_TARGET} /* Build configuration list for PBXNativeTarget \"{APP}\" */ = {{")
w("\t\t\tisa = XCConfigurationList;")
w("\t\t\tbuildConfigurations = (")
w(f"\t\t\t\t{CONF_TARGET_DEBUG} /* Debug */,")
w(f"\t\t\t\t{CONF_TARGET_RELEASE} /* Release */,")
w("\t\t\t);")
w("\t\t\tdefaultConfigurationIsVisible = 0;")
w("\t\t\tdefaultConfigurationName = Release;")
w("\t\t};")
w("/* End XCConfigurationList section */")

w("\t};")
w(f"\trootObject = {PROJECT} /* Project object */;")
w("}")

os.makedirs(PROJECT_DIR, exist_ok=True)
with open(os.path.join(PROJECT_DIR, "project.pbxproj"), "w", encoding="utf-8") as handle:
    handle.write("\n".join(out) + "\n")

workspace = os.path.join(PROJECT_DIR, "project.xcworkspace")
os.makedirs(workspace, exist_ok=True)
with open(os.path.join(workspace, "contents.xcworkspacedata"), "w", encoding="utf-8") as handle:
    handle.write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<Workspace\n'
        '   version = "1.0">\n'
        '   <FileRef\n'
        '      location = "self:">\n'
        '   </FileRef>\n'
        '</Workspace>\n'
    )

schemes = os.path.join(PROJECT_DIR, "xcshareddata", "xcschemes")
os.makedirs(schemes, exist_ok=True)
scheme = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1520"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{TARGET}"
               BuildableName = "{APP}.app"
               BlueprintName = "{APP}"
               ReferencedContainer = "container:{APP}.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{TARGET}"
            BuildableName = "{APP}.app"
            BlueprintName = "{APP}"
            ReferencedContainer = "container:{APP}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{TARGET}"
            BuildableName = "{APP}.app"
            BlueprintName = "{APP}"
            ReferencedContainer = "container:{APP}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""
with open(os.path.join(schemes, f"{APP}.xcscheme"), "w", encoding="utf-8") as handle:
    handle.write(scheme)

print(f"{len(sources)} Swift-Dateien, {len(resources)} Ressourcen -> {PROJECT_DIR}")
for path in sources:
    print("  ", path)
