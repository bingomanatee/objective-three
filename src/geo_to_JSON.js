
var _GEO_EXPORTER = new THREE.GeometryExporter();

/**
 * This method compresses all relevant geometry data to flat arrays
 * for the best transmission to web workers / saving etc.
 * @param geo
 */
O3.prototype.util.geo_to_JSON = function(geo){
    var geo_data = _GEO_EXPORTER.parse(geo);

    var coordinates = _.reduce(geo_data.verticies, function(c, v){
        // compress geometry to at most four decimal places
        c.push(
            v.x % 1 ? O3.util.digits(v.x, 4) : v.x,
            v.y % 1 ? O3.util.digits(v.y, 4) : v.y,
            v.z % 1 ? O3.util.digits(v.z, 4) : v.z
        );
        return c;
    }, []);

    // don't do any rounding on UVs -- too small a space.
    var uvs = _.reduce(geo_data.uvs, function(c, uv){
        c.push(uv.x, uv.y);
        return c;
    });

    var point_count = [];
    var points = [];


}