O3.fast_geo_merge = function ( geometry1, object2 /* mesh | geometry */, materialIndexOffset ) {

  var matrix, normalMatrix,
    vertexOffset = geometry1.vertices.length,
    uvPosition = geometry1.faceVertexUvs[ 0 ].length,
    geometry2 = object2 instanceof THREE.Mesh ? object2.geometry : object2,
    vertices1 = geometry1.vertices,
    vertices2 = geometry2.vertices,
    faces1 = geometry1.faces,
    faces2 = geometry2.faces,
    uvs1 = geometry1.faceVertexUvs[ 0 ],
    uvs2 = geometry2.faceVertexUvs[ 0 ];

  if ( materialIndexOffset === undefined ) materialIndexOffset = 0;

  if ( object2 instanceof THREE.Mesh ) {

    object2.matrixAutoUpdate && object2.updateMatrix();

    matrix = object2.matrix;

    normalMatrix = new THREE.Matrix3().getNormalMatrix( matrix );

  }

  // vertices

  for ( var i = 0, il = vertices2.length; i < il; i ++ ) {

    var vertex = vertices2[ i ];

    var vertexCopy =  vertex; //vertex.clone();

    if ( matrix ) vertexCopy.applyMatrix4( matrix );

    vertices1.push( vertexCopy );

  }

  // faces

  for ( i = 0, il = faces2.length; i < il; i ++ ) {

    var face = faces2[ i ], faceCopy, normal, color,
      faceVertexNormals = face.vertexNormals,
      faceVertexColors = face.vertexColors;

    faceCopy = new THREE.Face3( face.a + vertexOffset, face.b + vertexOffset, face.c + vertexOffset );
    faceCopy.normal.copy( face.normal );

    if ( normalMatrix ) {

      faceCopy.normal.applyMatrix3( normalMatrix ).normalize();

    }

    for ( var j = 0, jl = faceVertexNormals.length; j < jl; j ++ ) {

      normal = faceVertexNormals[ j ].clone();

      if ( normalMatrix ) {

        normal.applyMatrix3( normalMatrix ).normalize();

      }

      faceCopy.vertexNormals.push( normal );

    }

    faceCopy.color.copy( face.color );

    for ( var j = 0, jl = faceVertexColors.length; j < jl; j ++ ) {

      color = faceVertexColors[ j ];
      faceCopy.vertexColors.push( color.clone() );

    }

    faceCopy.materialIndex = face.materialIndex + materialIndexOffset;

    faceCopy.centroid.copy( face.centroid );

    if ( matrix ) {

      faceCopy.centroid.applyMatrix4( matrix );

    }

    faces1.push( faceCopy );

  }

  // uvs

  for ( i = 0, il = uvs2.length; i < il; i ++ ) {

    var uv = uvs2[ i ], uvCopy = [];

    for ( var j = 0, jl = uv.length; j < jl; j ++ ) {

      uvCopy.push( new THREE.Vector2( uv[ j ].x, uv[ j ].y ) );

    }

    uvs1.push( uvCopy );

  }

}

var limit = 0;