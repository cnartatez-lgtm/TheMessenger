"""Export the website's four exhibits from the game's art with Blender in background mode."""

import shutil
import tempfile
from math import radians
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
    bpy.ops.import_scene.fbx(filepath=str(path), use_image_search=False, use_custom_props=False)
    return list(bpy.context.selected_objects)


def web_material(slug, texture, scratch):
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
    return material


def bounds(points):
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    return low, high


def static_mesh(slug, mesh):
    graph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(graph)
    geometry = bpy.data.meshes.new_from_object(evaluated, depsgraph=graph)
    geometry.transform(evaluated.matrix_world)
    low, high = bounds([v.co for v in geometry.vertices])
    center = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
    geometry.transform(Matrix.Scale(2 / max(high - low), 4) @ Matrix.Translation(-center))
    preview = bpy.data.objects.new(slug, geometry)
    bpy.context.collection.objects.link(preview)
    return preview


def bake_walk(rig, mesh, clip, arm_clearance):
    scene = bpy.context.scene
    start, end = map(round, clip.animation_data.action.frame_range)
    rig.animation_data_clear()
    bones = list(rig.pose.bones)
    hips = rig.pose.bones["Hips"]
    # These FBX clips store the first walking pose as their bind pose. Transfer posed joint
    # transforms into the display mesh's bind space so each stride starts on the correct foot.
    local_bind_inverse = []
    for bone in bones:
        bind = bone.bone.matrix_local
        if bone.parent:
            bind = bone.parent.bone.matrix_local.inverted() @ bind
        local_bind_inverse.append(bind.inverted())
        bone.rotation_mode = "QUATERNION"
    lift_axis = (rig.matrix_world @ hips.bone.matrix_local).to_3x3().inverted() @ Vector((0, 0, 1))
    extents, samples = [], []
    for frame in range(start, end):
        scene.frame_set(frame)
        for bone, inverse in zip(bones, local_bind_inverse):
            source = clip.pose.bones[bone.name]
            local = source.parent.matrix.inverted() @ source.matrix if source.parent else source.matrix
            basis = inverse @ local
            bone.rotation_quaternion = basis.to_quaternion()
            if not bone.parent:
                bone.location = basis.translation
            else:
                bone.location = (0, 0, 0)
            bone.scale = (1, 1, 1)
        bpy.context.view_layer.update()
        # Give the sleeves room to swing past the tunic through the entire stride.
        for joint, angle in (("RightArm", arm_clearance), ("LeftArm", -arm_clearance)):
            arm = rig.pose.bones[joint]
            pose = rig.matrix_world @ arm.matrix
            turned = Matrix.Rotation(radians(angle), 4, "Y") @ pose
            turned.translation = pose.translation
            arm.matrix = rig.matrix_world.inverted() @ turned
        bpy.context.view_layer.update()
        posed = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        low, high = bounds([posed.matrix_world @ v.co for v in posed.data.vertices])
        samples.append((hips.location.copy() - lift_axis * low.z, [b.rotation_quaternion.copy() for b in bones]))
        extents.extend((Vector((low.x, low.y, 0)), Vector((high.x, high.y, high.z - low.z))))

    # Open on a readable stride. Repeat the first sample exactly at the loop boundary.
    first = round(len(samples) * 0.19)
    samples = samples[first:] + samples[:first]
    previous = samples[0][1]
    for frame, (location, rotations) in enumerate([*samples, samples[0]]):
        hips.location = location
        hips.keyframe_insert(data_path="location", frame=frame)
        for bone, rotation, last in zip(bones, rotations, previous):
            rotation.make_compatible(last)
            bone.rotation_quaternion = rotation
            bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
        previous = rotations
    rig.animation_data.action.name = "Walk"
    scene.frame_start, scene.frame_end = 0, len(samples)
    scene.frame_set(0)
    return bounds(extents)


def export(slug, source, texture, walk=None, arm_clearance=0):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with tempfile.TemporaryDirectory() as folder:
        scratch = Path(folder)
        objects = import_copy(source, scratch)
        mesh, = (obj for obj in objects if obj.type == "MESH")
        if walk:
            rig, = (obj for obj in objects if obj.type == "ARMATURE")
            clip, = (obj for obj in import_copy(walk, scratch) if obj.type == "ARMATURE")
            low, high = bake_walk(rig, mesh, clip, arm_clearance)
            center = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, 0))
            size = 2 / max(high - low)
            display = bpy.data.objects.new(slug, None)
            bpy.context.collection.objects.link(display)
            display.matrix_world = Matrix.Scale(size, 4) @ Matrix.Translation(-center)
            rig.parent = display
            rig.name, mesh.name = "Walk joints", "Character"
            # glTF uses Y for height and reverses Blender's Y axis for depth.
            display["walkBounds"] = [(low.x-center.x)*size, 0, -(high.y-center.y)*size,
                                     (high.x-center.x)*size, high.z*size, -(low.y-center.y)*size]
            selected = [display, rig, mesh]
        else:
            mesh = static_mesh(slug, mesh)
            selected = [mesh]

        mesh.data.materials.clear()
        mesh.data.materials.append(web_material(slug, texture, scratch))
        bpy.ops.object.select_all(action="DESELECT")
        for obj in selected:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = mesh
        bpy.ops.export_scene.gltf(
            filepath=str(OUTPUT / f"{slug}.glb"), export_format="GLB", use_selection=True,
            export_animations=bool(walk), export_skins=bool(walk), export_extras=bool(walk),
            export_animation_mode="ACTIVE_ACTIONS", export_nla_strips_merged_animation_name="Walk",
            export_frame_range=True, export_def_bones=True,
            export_leaf_bone=False, export_morph=False, export_cameras=False, export_lights=False,
        )


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    export("rooftop-house", "N_CasaAzotea01.fbx", "N_CasaAzotea01_BaseMap.png")
    export("tychicus", "Tychicus_Desert.fbx", "Tychicus_Desert_BaseColor.png", "Tychicus_Walk_Loop.fbx", 14)
    export("roman-guard", "RomanGuard.fbx", "RomanGuard_BaseColor.png", "RomanGuard_Walk_Loop.fbx", 5)
    export("watchtower", "N_TorreAlta01.fbx", "N_TorreAlta01_BaseMap.png")
