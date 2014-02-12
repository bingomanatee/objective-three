function RenderObject(content, params) {
    this.content = content;
    this.display = null;
    this.update_on_animate = true;

    this.children = [];
    this.parent = null;

    var self = this;

    _.each(['update'], function(event){
        self.on(event, function(){
            self[event]();
            self._cascade(event);
        })
    });

    _.extend(this, params);
}

O3.util.inherits(RenderObject, EventEmitter);

_.extend(
    RenderObject.prototype, {

        _cascade: function (event, data) {
            _.each(this.children, function (c) {
                c.emit(event, data);
            });
        },

        update: function () {

        },

        add: function (ro) {
            this.children.push(ro);
            this.content.add(ro.content);
            ro.parent = this;
        },

        remove: function(ro){
            ro.parent = null;
            this.content.remove(ro.content);
        },

        detach: function(){
            if (this.parent){
                this.parent.remove(this);
            }
        }
    });

O3.RenderObject = RenderObject;