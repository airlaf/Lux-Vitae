import * as T from './vendor/three.module.js';

// Clip short lighting rays against the existing extruded profiles. The inserts
// sit just inside the bevels, so adjacent parts can mask incoming studio light
// without a dark outline along the probe's own surface.
export function addSteelVisibility(material, profiles, root) {
  const planes = [];
  const bindings = [];
  profiles.forEach(({mesh,outline,width})=>{
    const center = outline.reduce((sum,[z,y])=>sum.add(new T.Vector2(z,y)),new T.Vector2()).divideScalar(outline.length);
    const first = planes.length;
    planes.push(new T.Vector4(1,0,0,-width/2+.4),new T.Vector4(-1,0,0,-width/2+.4));
    outline.forEach(([z,y],i)=>{
      const [nextZ,nextY]=outline[(i+1)%outline.length];
      const n=new T.Vector2(nextY-y,z-nextZ).normalize();
      if(n.x*(center.x-z)+n.y*(center.y-y)>0)n.negate();
      planes.push(new T.Vector4(0,n.y,n.x,-n.x*z-n.y*y+.4));
    });
    bindings.push({mesh,first,end:planes.length});
  });
  const centers=bindings.map(()=>new T.Vector3());
  const shaderFunctions=bindings.map(({first,end},i)=>`
    {
      vec3 local = origin - steelCenters[${i}];
      float enter = 0., leave = nearest;
      for (int p=${first};p<${end};p++) {
        vec4 plane = steelPlanes[p];
        float distance = dot(plane.xyz, local) + plane.w;
        float speed = dot(plane.xyz, ray);
        if (abs(speed)<.00001) {
          if (distance>0.) leave=-1.;
        } else if (speed<0.) {
          enter=max(enter,-distance/speed);
        } else {
          leave=min(leave,-distance/speed);
        }
      }
      if (enter<leave) nearest=min(nearest,enter);
    }`).join('');
  material.onBeforeCompile=shader=>{
    shader.uniforms.steelPlanes={value:planes};
    shader.uniforms.steelCenters={value:centers};
    shader.vertexShader='varying vec3 steelPosition;\n'+shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nsteelPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`
      varying vec3 steelPosition;
      uniform vec4 steelPlanes[${planes.length}];
      uniform vec3 steelCenters[${centers.length}];
      float steelVisibility(vec3 origin,vec3 ray){
        float nearest=48.;
        ${shaderFunctions}
        return mix(.35,1.,smoothstep(0.,48.,nearest));
      }
    `+shader.fragmentShader.replace('#include <aomap_fragment>',`
      #include <aomap_fragment>
      vec3 surfaceNormal=inverseTransformDirection(normal, viewMatrix);
      vec3 start=steelPosition+surfaceNormal*.65;
      vec3 reflection=reflect(normalize(steelPosition-cameraPosition),surfaceNormal);
      reflectedLight.indirectSpecular *= steelVisibility(start,reflection);
    `);
  };
  return ()=>{
    root.updateWorldMatrix(true,true);
    bindings.forEach(({mesh},i)=>centers[i].setFromMatrixPosition(mesh.matrixWorld));
  };
}
