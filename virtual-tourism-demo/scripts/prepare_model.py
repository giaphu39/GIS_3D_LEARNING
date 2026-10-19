"""Derive the web GLB without touching the downloaded original. Requires Pillow, numpy."""
import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/model_3D/dinh-doc-lap-independence-palace/source/DINH.glb'
OUTPUT = ROOT / 'data/models/dinh-doc-lap.glb'


def prepare():
    raw = SOURCE.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + length])
    binary = raw[28 + length:]
    assert len(doc['nodes']) == 1, 'Review transforms before preparing another model.'
    node = doc['nodes'][0]
    x, y, z, w = node['rotation']
    rotation = np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
        [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)],
    ])
    bounds = []
    kept = []
    for primitive in doc['meshes'][0]['primitives']:
        material = doc['materials'][primitive['material']] if 'material' in primitive else {}
        if material.get('name') == 'white-cloud-blue-sky-sea':
            continue  # Presentation backdrop, not a building or geographic surface.
        kept.append(primitive)
        accessor = doc['accessors'][primitive['attributes']['POSITION']]
        bv = doc['bufferViews'][accessor['bufferView']]
        vertices = np.ndarray((accessor['count'], 3), '<f4', binary,
                              bv.get('byteOffset', 0) + accessor.get('byteOffset', 0),
                              strides=(bv.get('byteStride', 12), 4))
        world = (vertices * node['scale']) @ rotation.T + node['translation']
        bounds.append((world.min(0), world.max(0)))
        if material.get('name') == 'Secon':
            building_min, building_max = world.min(0), world.max(0)
    doc['meshes'][0]['primitives'] = kept
    low = np.min([v[0] for v in bounds], axis=0)
    high = np.max([v[1] for v in bounds], axis=0)
    center = (building_min + building_max) / 2
    # glTF Y is up. Front was +Z; rotate 180 degrees so the prepared front is -Z
    # (north after Esri's Y-up -> Z-up conversion). Origin is building center/floor.
    doc['nodes'].append({'name': 'GIS origin: main building center, floor; front north',
                         'children': [0], 'rotation': [0, 1, 0, 0],
                         'translation': [float(center[0]), float(-low[1]), float(center[2])]})
    doc['scenes'][0]['nodes'] = [1]
    replacements = {}
    for entry in doc['images']:
        bv = doc['bufferViews'][entry['bufferView']]
        start = bv.get('byteOffset', 0)
        im = Image.open(io.BytesIO(binary[start:start+bv['byteLength']]))
        im.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        if entry['mimeType'] == 'image/png':
            im.save(out, format='PNG', optimize=True)
        else:
            im.convert('RGB').save(out, format='JPEG', quality=85, optimize=True)
        replacements[entry['bufferView']] = out.getvalue()
    packed = bytearray()
    for i, bv in enumerate(doc['bufferViews']):
        start = bv.get('byteOffset', 0)
        content = replacements.get(i, binary[start:start+bv['byteLength']])
        packed.extend(b'\0' * (-len(packed) % 4))
        bv['byteOffset'], bv['byteLength'] = len(packed), len(content)
        packed.extend(content)
    packed.extend(b'\0' * (-len(packed) % 4))
    doc['buffers'][0]['byteLength'] = len(packed)
    doc['asset']['copyright'] = 'Hoàng Huy / Sketchfab, CC Attribution; web adaptation: GIS_LEARNING'
    encoded = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    result = (struct.pack('<III', 0x46546C67, 2, 28+len(encoded)+len(packed))
              + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
              + struct.pack('<II', len(packed), 0x004E4942) + packed)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(result)
    report = {'sourceBytes': len(raw), 'webBytes': len(result),
              'sourceBoundsAfterNodeTransform': [low.tolist(), high.tolist()],
              'mainBuildingBounds': [building_min.tolist(), building_max.tolist()],
              'originBeforeNormalization': [float(center[0]), float(low[1]), float(center[2])],
              'removed': ['white-cloud-blue-sky-sea backdrop'], 'maxTexturePixels': 1024,
              'units': 'meters (approximate source model)', 'front': 'north before headingDegrees',
              'placementStatus': 'approximate; not a surveyed georeference'}
    OUTPUT.with_suffix('.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    prepare()
