/**
 * MatProy is a set of properties that the
 * @param name
 * @param params
 * @constructor
 */
function MatProxy(name, params) {
    this.name = name;
    this.context = null;
    if (params.context) {
        this.context = params.context;
        delete params.context;
    }
    this._params = params || {};
}

O3.util.inherits(MatProxy, EventEmitter);

_.extend(MatProxy.prototype, {

    set: function (prop, value) {
        this._params[prop] = value;
        this.update_obj();
    },

    get: function (prop) {
        return this._params.hasOwnProperty(prop) ? this._params[prop] : null;
    },

    set_params: function (props) {
        console.log('setting params of ', this.name, this.context, 'to', props);
        _.extend(this._params, props);
        this.update_obj();
    },

    parent: function () {
        var parent = this.get('parent');
        if (!parent) {
            return null;
        } else if (_.isString(parent) && (!this.name == parent)) {
            return this.context.mat(parent);
        } else {
            return null;
        }
    },

    params: function () {
        var out;
        var parent;
        var base;

        if (this._params.parent) {

            if (_.isString(this._params.parent) && this.context) {
                if (this._params.parent == this.name) {
                    console.log('circular parenting');
                } else {
                    parent = this.context.mat(this._params.parent).params();
                }
            } else if (_.isObject(this._params.parent)) {
                parent = this._params.parent;
            }
        }

        if (this.context !== O3) {
            base = O3.mat(this.name).params();
        }

        out = _.extend({type: 'basic'}, parent, base, this._params);

        _.each(out, function (v, p) {
            if (v && v.clone) {
                out[p] = v.clone();
            }
        });

        return out;
    },

    update_obj: function(){
       if (this.context !== O3){
           if (this._obj){
               _.extend(this._obj, this.params());
           }
       }

        _.each(this.children(), function(c){
            c.update_obj();
        });
    },

    children: function(){
        var children = this.context.mats({parent: this.name});
        if (this.context == O3){
            _.each(this.context.displays, function(d){
                children = children.concat(d.mats({name: this.name}))
            }, this)
        }
    },

    obj: function () {
        if (!this._obj) {

            var mat_values = this.params();

            if (_.isString(mat_values.type)) {
                if (THREE.hasOwnProperty(mat_values.type)) {
                    this._obj = new THREE[mat_values.type](mat_values);
                } else if (MatProxy.ALIASES[mat_values.type]) {
                    var name = MatProxy.ALIASES[mat_values.type];
                    if (THREE[name]) {
                        this._obj = new THREE[name](mat_values);
                    } else {
                        throw new Error('cannot find material class ' + name);
                    }
                } else {
                    throw new Error('cannot find material class ' + mat_values.type);
                }

            } else {
                this._obj = new mat_values.type(mat_values);
            }
        }

        return this._obj;
    },

    _on_update: function () {
        if (this._obj) {
            _.extend(this._obj, this.params());
        }
    }

});

MatProxy.ALIASES = {
    '':           'MeshBasicMaterial',
    shader:       'ShaderMaterial',
    spritecanvas: 'SpriteCanvasMaterial',
    'sprite':     'SpriteMaterial'
};

_.each('lambert,face,normal,phong,depth,basic'.split(','),
    function (base) {
        MatProxy.ALIASES[base] = MatProxy.ALIASES[base.toLowerCase()] = 'Mesh' + base.substr(0, 1).toUpperCase() + base.substr(1) + 'Material';
    });