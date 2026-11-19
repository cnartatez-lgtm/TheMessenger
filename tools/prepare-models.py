"""Run with Blender in background mode to export the four website exhibits."""

import shutil
import tempfile
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


SITE = Path(__file__).resolve().parents[1]
ART = SITE.parent / "BibleJourneyGame/BibleJourneyUnity/Assets/_BibleJourney/Art"
OUTPUT = SITE / "assets/models"


def game_file(name):
    matches = list(ART.rglob(name))
    if len(matches) != 1:
        raise ValueError(f"Expected one game asset named {name}, found {matches}")
    return matches[0]


def import_copy(name, scratch):
    path = scratch / name
    shutil.copyfile(game_file(name), path)
    bpy.ops.import_scene.fbx(filepath=str(path), use_image_search=False)
    return list(bpy.context.selected_objects)


def export(slug, source, texture, idle=None, frame=1):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with tempfile.TemporaryDirectory() as folder:
        scratch = Path(folder)
        objects = import_copy(source, scratch)
        mesh, = (obj for obj in objects if obj.type == "MESH")
        if idle:
            rig, = (obj for obj in objects if obj.type == "ARMATURE")
            clip, = (obj for obj in import_copy(idle, scratch) if obj.type == "ARMATURE")
            rig.animation_data.action = clip.animation_data.action
            rig.animation_data.action_slot = clip.animation_data.action_slot

        # Bake a single in-game pose. The character rig and animation clips stay in Unity.
        bpy.context.scene.frame_set(frame)
        graph = bpy.context.evaluated_depsgraph_get()
        evaluated = mesh.evaluated_get(graph)
        geometry = bpy.data.meshes.new_from_object(evaluated, depsgraph=graph)
        geometry.transform(evaluated.matrix_world)
        vertices = [v.co for v in geometry.vertices]
        low = Vector(tuple(min(v[i] for v in vertices) for i in range(3)))
        high = Vector(tuple(max(v[i] for v in vertices) for i in range(3)))
        center = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
        geometry.transform(Matrix.Scale(2 / max(high - low), 4) @ Matrix.Translation(-center))
        preview = bpy.data.objects.new(slug, geometry)
        bpy.context.collection.objects.link(preview)

        jpg = scratch / "color.jpg"
        image = bpy.data.images.load(str(game_file(texture)), check_existing=False)
        scale = min(1.0, 1024 / max(image.size))
        image.scale(*(max(1, round(n * scale)) for n in image.size))
        image.filepath_raw = str(jpg)
        image.file_format = "JPEG"
        image.save()
        material = bpy.data.materials.new(slug)
        material.use_nodes = True
        surface = material.node_tree.nodes.get("Principled BSDF")
        surface.inputs["Roughness"].default_value = 0.91
        color = material.node_tree.nodes.new("ShaderNodeTexImage")
        color.image = bpy.data.images.load(str(jpg), check_existing=False)
        material.node_tree.links.new(color.outputs["Color"], surface.inputs["Base Color"])
        geometry.materials.clear()
        geometry.materials.append(material)
        bpy.ops.object.select_all(action="DESELECT")
        preview.select_set(True)
        bpy.context.view_layer.objects.active = preview
        bpy.ops.export_scene.gltf(
            filepath=str(OUTPUT / f"{slug}.glb"), export_format="GLB",
            use_selection=True, export_animations=False, export_skins=False,
            export_morph=False, export_extras=False, export_cameras=False, export_lights=False,
        )


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    export("rooftop-house", "N_CasaAzotea01.fbx", "N_CasaAzotea01_BaseMap.png")
    export("tychicus", "Tychicus_Desert.fbx", "Tychicus_Desert_BaseColor.png", "Tychicus_Idle_Loop.fbx", 32)
    export("roman-guard", "RomanGuard.fbx", "RomanGuard_BaseColor.png", frame=8)
    export("watchtower", "N_TorreAlta01.fbx", "N_TorreAlta01_BaseMap.png")
