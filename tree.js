import * as THREE from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

export async function createTree(){
    let loader = new FBXLoader();
    let object = await loader.loadAsync('./sources/oak 01.fbx');
    return object
}

