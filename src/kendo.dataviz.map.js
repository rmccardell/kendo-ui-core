kendo_module({
    id: "dataviz.map",
    name: "Map",
    category: "dataviz",
    description: "",
    depends: [ "data", "userevents", "dataviz.core", "dataviz.svg", "dataviz.themes" ]
});

(function ($, undefined) {
    // Imports ================================================================
    var math = Math,
        atan = math.atan,
        exp = math.exp,
        pow = math.pow,
        sin = math.sin,
        log = math.log,
        tan = math.tan,

        proxy = $.proxy,

        kendo = window.kendo,
        Class = kendo.Class,
        ObservableArray = kendo.data.ObservableArray,
        Widget = kendo.ui.Widget,

        dataviz = kendo.dataviz,
        Matrix = dataviz.Matrix,
        deepExtend = kendo.deepExtend,
        defined = dataviz.defined,

        g = dataviz.geometry,
        Point = g.Point,

        map = dataviz.map,
        Extent = map.Extent,
        Location = map.Location,

        util = dataviz.util,
        rad = util.rad,
        deg = util.deg,
        limit = util.limitValue;

    // Constants ==============================================================
    var FRICTION = 0.90,
        PI = math.PI,
        PI_DIV_2 = PI / 2,
        PI_DIV_4 = PI / 4,
        DEG_TO_RAD = PI / 180,
        MAX_ZOOM = 18,
        VELOCITY_MULTIPLIER = 5;

    // Map widget =============================================================
    var Map = Widget.extend({
        init: function(element, options) {
            var map = this;

            Widget.fn.init.call(map, element);

            map._initOptions(options);
            map.scrollWrap = $("<div></div>").appendTo(map.element);

            map.crs = new EPSG3857();

            map.layers = new ObservableArray([]);
            map._renderLayers();

            var scroller = map.scroller = new kendo.mobile.ui.Scroller(map.scrollWrap, {
                friction: FRICTION,
                velocityMultiplier: VELOCITY_MULTIPLIER
            });
            scroller.bind("scroll", proxy(map._scroll, map));
            scroller.bind("scrollEnd", proxy(map._scrollEnd, map));

            map._reset();
        },

        options: {
            name: "Map",
            layers: [],
            zoom: 3,
            minSize: 256,
            minZoom: 2
        },

        events:[
            "reset", // TODO: Redraw?
            "drag",
            "dragEnd"
        ],

        zoom: function(level) {
            if (defined(level)) {
                this.options.view.zoom = limit(level, this.options.minZoom, MAX_ZOOM);

                this._reset();
            } else {
                return this.options.view.zoom;
            }
        },

        scale: function() {
            return this.options.minSize * pow(2, this.options.view.zoom);
        },

        toLayerPoint: function(location) {
            return this.crs.toPoint(location, this.scale());
        },

        toScreenPoint: function(location) {
            var origin = this.toLayerPoint(this._screenOrigin);
            var point = this.toLayerPoint(location);

            return point.subtract(origin);
        },

        _scroll: function(e) {
            var center = this.toLayerPoint(this._scrollOrigin);
            center.x += e.scrollLeft;
            center.y += e.scrollTop;
            this.center(this.crs.toLocation(center, this.scale()));

            this.trigger("drag");
        },

        _scrollEnd: function() {
            this.trigger("dragEnd");
        },

        _reset: function() {
            this._scrollOrigin = this.center();
            this._screenOrigin = this.viewport().nw;
            this._resetScroller();
            this.trigger("reset");
        },

        _resetScroller: function() {
            var scroller = this.scroller;
            scroller.dimensions.y.makeVirtual();
            scroller.dimensions.x.makeVirtual();

            var nw = this.toLayerPoint(this.viewport().nw);
            scroller.dimensions.x.virtualSize(-nw.x, this.scale() - nw.x);
            scroller.dimensions.y.virtualSize(-nw.y, this.scale() - nw.y);
        },

        _renderLayers: function() {
            var defs = this.options.layers,
                layers = this.layers = [],
                scrollWrap = this.scrollWrap;

            scrollWrap.empty();

            for (var i = 0; i < defs.length; i++) {
                // TODO: Either pass layer type directly or create from a factory based on type id
                var options = defs[i];
                var type = dataviz.map.layers[options.type];
                if (type) {
                    layers.push(new type(this, options));
                }
            }

            this.trigger("reset");
        },

        // TODO: Rename to extent
        viewport: function() {
            var map = this,
                scale = map.scale(),
                halfWidth = map.element.width() / 2,
                halfHeight = map.element.height() / 2,
                crs = map.crs,
                cp = crs.toPoint(map.center(), scale);

            var p0 = cp.clone();
            p0.x -= halfWidth;
            p0.y -= halfHeight;

            var p1 = cp.clone();
            p1.x += halfWidth;
            p1.y += halfHeight;

            return new Extent(
                crs.toLocation(p0, scale),
                crs.toLocation(p1, scale)
            );
        },

        center: function(center) {
            if (center) {
                this._center = center;
            } else if (!this._center) {
                this._center = new Location(
                    this.options.view.center[0],
                    this.options.view.center[1]
                );
            }

            return this._center;
        }
    });

    var WGS84 = {
        a: 6378137,                 // Semi-major radius
        b: 6356752.314245179,       // Semi-minor radius
        f: 0.0033528106647474805,   // Flattening
        e: 0.08181919084262149      // Eccentricity
    };

    // WGS 84 / World Mercator
    var Mercator = Class.extend({
        init: function(options) {
            this._initOptions(options);
        },

        MAX_LNG: 180,
        MAX_LAT: 85.0840590501,
        INVERSE_ITERATIONS: 15,
        INVERSE_CONVERGENCE: 1e-12,

        options: {
            centralMeridian: 0,
            datum: WGS84
        },

        forward: function(loc) {
            var proj = this,
                options = proj.options,
                datum = options.datum,
                r = datum.a,
                lng0 = options.centralMeridian,
                lat = limit(loc.lat, -proj.MAX_LAT, proj.MAX_LAT),
                lng = limit(loc.lng, -proj.MAX_LNG, proj.MAX_LNG),
                x = rad(lng - lng0) * r,
                y = proj._projectLat(lat);

            return new Point(x, y);
        },

        _projectLat: function(lat) {
            var datum = this.options.datum,
                ecc = datum.e,
                r = datum.a,
                y = rad(lat),
                ts = tan(PI_DIV_4 + y / 2),
                con = ecc * sin(y),
                p = pow((1 - con) / (1 + con), ecc / 2);

            // See:
            // http://en.wikipedia.org/wiki/Mercator_projection#Generalization_to_the_ellipsoid
            return r * log(ts * p);
        },

        inverse: function(point) {
            var proj = this,
                options = proj.options,
                datum = options.datum,
                r = datum.a,
                lng0 = options.centralMeridian,
                lng = limit(point.x / (DEG_TO_RAD * r) + lng0, -proj.MAX_LNG, proj.MAX_LNG),
                lat = limit(proj._inverseY(point.y), -proj.MAX_LAT, proj.MAX_LAT);

            lng = limit(lng, -proj.MAX_LNG, proj.MAX_LNG);
            lat = limit(lat, -proj.MAX_LAT, proj.MAX_LAT);

            return new Location(lat, lng);
        },

        _inverseY: function(y) {
            var proj = this,
                datum = proj.options.datum,
                r = datum.a,
                ecc = datum.e,
                ecch = ecc / 2,
                ts = exp(-y / r),
                phi = PI_DIV_2 - 2 * atan(ts),
                i;

            for (i = 0; i <= proj.INVERSE_ITERATIONS; i++) {
                var con = ecc * sin(phi),
                    p = pow((1 - con) / (1 + con), ecch),
                    dphi = PI_DIV_2 - 2 * atan(ts * p) - phi;

                phi += dphi;

                if (math.abs(dphi) <= proj.INVERSE_CONVERGENCE) {
                    break;
                }
            }

            return deg(phi);
        }
    });

    // WGS 84 / Pseudo-Mercator
    // Used by Google Maps, Bing, OSM, etc.
    // Spherical projection of ellipsoidal coordinates.
    var SphericalMercator = Mercator.extend({
        MAX_LAT: 85.0511287798,

        _projectLat: function(lat) {
            var r = this.options.datum.a,
                y = rad(lat),
                ts = tan(PI_DIV_4 + y / 2);

            return r * log(ts);
        },

        _inverseY: function(y) {
            var r = this.options.datum.a,
                ts = exp(-y / r);

            return deg(PI_DIV_2 - (2 * atan(ts)));
        }
    });

    var Equirectangular = Class.extend({
        forward: function(loc) {
            return new Point(loc.lng, loc.lat);
        },

        inverse: function(point) {
            return new Location(point.y, point.x);
        }
    });

    // TODO: Better (less cryptic name) for this class(es)
    var EPSG3857 = Class.extend({
        init: function() {
            var crs = this,
                proj = crs._proj = new SphericalMercator();

            var c = this.c = 2 * PI * proj.options.datum.a;

            // Scale circumference to 1, mirror Y and shift origin to top left
            this._tm = Matrix.translate(0.5, 0.5).times(Matrix.scale(1/c, -1/c));

            // Inverse transform matrix
            this._itm = Matrix.scale(c, -c).times(Matrix.translate(-0.5, -0.5));
        },

        // Location <-> Point (screen coordinates for a given scale)
        toPoint: function(loc, scale) {
            var point = this._proj.forward(loc);

            return point
                .transform(this._tm)
                .multiply(scale || 1);
        },

        toLocation: function(point, scale) {
            point = point
                .clone()
                .multiply(1 / (scale || 1))
                .transform(this._itm);

            return this._proj.inverse(point);
        }
    });

    var EPSG3395 = Class.extend({
        init: function() {
            this._proj = new Mercator();
        },

        toPoint: function(loc) {
            return this._proj.forward(loc);
        },

        toLocation: function(point) {
            return this._proj.inverse(point);
        }
    });

    // WGS 84
    var EPSG4326 = Class.extend({
        init: function() {
            this._proj = new Equirectangular();
        },

        toPoint: function(loc) {
            return this._proj.forward(loc);
        },

        toLocation: function(point) {
            return this._proj.inverse(point);
        }
    });

    // Exports ================================================================
    dataviz.ui.plugin(Map);

    deepExtend(dataviz, {
        map: {
            crs: {
                EPSG3395: EPSG3395,
                EPSG3857: EPSG3857,
                EPSG4326: EPSG4326
            },
            datums: {
                WGS84: WGS84
            },
            projections: {
                Equirectangular: Equirectangular,
                Mercator: Mercator,
                SphericalMercator: SphericalMercator
            }
        }
    });

})(window.kendo.jQuery);
