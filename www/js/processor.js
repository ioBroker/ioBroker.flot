var graph;

var backgrounds = [
    ['#8e9eab', '#eef2f3'], // Portrait
    ['#517fa4', '#243949'], // Instagram
    ['#485563', '#29323c'], // ServQuick
    ['#abbaab', '#00ffff'], // Metallic Toad
    ['#ECE9E6', '#00ffff'], // Clouds
    ['#16222A', '#3A6073'], // Mirage
    ['#1F1C2C', '#928DAB'], // Steel Gray
    ['#003973', '#E5E5BE'], // Horizon
    ['#D1913C', '#FFD194'], // Koko Caramel
    ['#136a8a', '#267871']  // Turquoise flow
];

// Show "no connection" message after 5 seconds
var disconnectTimeout = setTimeout(function () {
    disconnectTimeout = null;
    //Show disconnected message
    $('#no-connection').show();
}, 5000);

var zoomTimeout = null;
var sessionId = 1;

// Analyse query
var path = location.href.split('?')[1];

// convert old format to new one
// OLD: http://localhost:8082/flot/index.html?range=1440&renderer=line&axeX=l&axeY=inside&_ids=system.adapter.admin.0.memRss%2Csystem.adapter.email.0.memRss&_colors=%23c05020%3B%2330c020%3B%236060c0
// NEW: http://localhost:8082/flot/index.html?l%5B0%5D%5Bid%5D=system.adapter.admin.0.memRss&l%5B0%5D%5Boffset%5D=0&l%5B0%5D%5Baggregate%5D=average&l%5B0%5D%5Bcolor%5D=%23FF0000&l%5B0%5D%5Bthickness%5D=3&l%5B1%5D%5Bid%5D=system.adapter.email.0.memRss&l%5B1%5D%5Boffset%5D=0&l%5B1%5D%5Bart%5D=average&l%5B1%5D%5Bcolor%5D=%2300FF00&l%5B1%5D%5Bthickness%5D=3&timeType=relative&relativeEnd=now&range=10&aggregateType=step&aggregateSpan=300&legend=sw
// OLD =>
//{
//    _colors: "#c05020;#30c020;#6060c0"
//    _ids: "system.adapter.admin.0.memRss,system.adapter.email.0.memRss"
//    axeX: "lines"
//    axeY: "inside"
//    range: "1440"
//    renderer: "line"
//}
// NEW =>
//{
//  "l" : [
//     {
//        "id" : "system.adapter.admin.0.memRss",
//        "offset" : "0",
//        "aggregate" : "m4",
//        "color" : "#FF0000",
//        "thickness" : "3"
//      }, {
//        "id" : "system.adapter.email.0.memRss",
//        "offset" : "0",
//        "aggregate" : "m4",
//        "color" : "#00FF00",
//        "thickness" : "3"
//      }
//  ],
//    "timeType" : "relative",
//    "relativeEnd" : "now",
//    "range" : "10",
//    "aggregateType" : "step",
//    "aggregateSpan" : "300",
//    "legend" : "sw    //}

var config = deparam(path || '');

if (config.lines) {
    config.l = JSON.parse(JSON.stringify(config.lines));
    delete config.lines;
}

if (config._ids) {
    var ids    = config._ids    ? config._ids.split(';')    : [];
    var colors = config._colors ? config._colors.split(';') : [];
    var names  = config._names  ? config._names.split(';')  : [];
    var units  = config._units  ? config._units.split(';')  : [];
    config.l = [];
    for (var i = 0; i < ids.length; i++) {
        config.l.push({
            id:         ids[i],
            offset:     0,
            name:       names[i] || '',
            aggregate:  'onchange',
            color:      colors[i] || 'blue',
            thickness:  config.strokeWidth || 1,
            shadowsize: config.strokeWidth || 1,
            min:        config.min || '',
            max:        config.max || '',
            unit:       units[i]   || ''
        });
    }
    config.range = parseInt(config.range, 10);
    config.aggregateType = 'step';
    config.aggregateSpan = 300;
    config.relativeEnd   = 'now';
}

// convert art to aggregate
if (config.l) {
    for (var j = 0; j < config.l.length; j++) {
        if (config.l[j].art) {
            config.l[j].aggregate = config.l[j].art;
            delete config.l[j].art;
        }
        if (config.instance && !config.l[j].instance) {
            config.l[j].instance = config.instance;
        }
    }
}

// Set default values
config.width        = config.width  || '100%';
config.height       = config.height || '100%';
config.timeFormat   = config.timeFormat || "%H:%M:%S %e.%m.%y";
config.useComma     = config.useComma === 'true' || config.useComma === true;
config.zoom         = config.zoom     === 'true' || config.zoom     === true;
config.afterComma   = (config.afterComma === undefined) ? 2 : config.afterComma;
config.timeType     = config.timeArt || config.timeType || 'relative';
//    if ((config.max !== undefined && config.max != '' && parseFloat(config.max) != NaN)) config.max = parseFloat(config.max);
var seriesData      = [];
var series          = [];
var settings        = [];
var liveInterval;

var navOptions      = {};
var socketURL       = '';
var socketSESSION   = '';
var now             = new Date();
// for zoom
var lastX           = null;
var mouseDown       = false;
var lastWidth       = null;

if (config.window_bg) $('body').css('background', config.window_bg);

if (typeof socketUrl != 'undefined') {
    socketURL = socketUrl;
    if (socketURL && socketURL[0] == ':') {
        socketURL = 'http://' + location.hostname + socketURL;
    }
    socketSESSION = socketSession;
}

var socket = io.connect(socketURL, {
    'query':                        'key=' + socketSESSION,
    'reconnection limit':           10000,
    'max reconnection attempts':    Infinity
});

socket.on('connect', function () {
    socket.emit('name', 'flot');
    if (disconnectTimeout) {
        $('#no-connection').hide();
        clearTimeout(disconnectTimeout);
        disconnectTimeout = null;
    }
    readData();
});

socket.on('disconnect', function () {
    if (!disconnectTimeout) {
        disconnectTimeout = setTimeout(function () {
            disconnectTimeout = null;
            //Show disconnected message
            $('#no-connection').show();
        }, 5000);
    }
});

function getStartStop(index, step) {
    var option = {};
    var end;
    var start;
    var _now;
    config.l[index].offset = config.l[index].offset || 0;

    if (config.zoomed) {
        navOptions[index].end   = config.l[index].zMax;
        navOptions[index].start = config.l[index].zMin;
        return navOptions[index];
    } else {
        if (!step) {
            if (config.timeType === 'static') {
                var startTime;
                var endTime;
                if (config.start_time !== undefined) {
                    startTime = config.start_time.split(':').map(Number);
                } else {
                    startTime = [0, 0];
                }

                if (config.end_time !== undefined) {
                    endTime = config.end_time.split(':').map(Number);
                } else {
                    endTime = [24, 0];
                }

                // offset is in seconds
                start = new Date(config.start).setHours(startTime[0], startTime[1]) - config.l[index].offset * 1000;
                end   = new Date(config.end)  .setHours(endTime[0],   endTime[1])   - config.l[index].offset * 1000;

            } else {
                if (config.relativeEnd == 'now') {
                    end   = now.getTime() - config.l[index].offset * 1000;
                    start = end - (config.range * 60000);
                } else if (config.relativeEnd == 'today') {
                    _now = new Date(now);
                    _now.setDate(_now.getDate() + 1);
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                    end   = _now.getTime() - config.l[index].offset * 1000;
                    start = end - (config.range * 60000);
                } else if (config.relativeEnd == 'month') {
                    _now = new Date(now);
                    _now.setMonth(_now.getMonth() + 1);
                    _now.setDate(1);
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                    end   = _now.getTime() - config.l[index].offset * 1000;
                    start = end - (config.range * 60000);
                } else if (config.relativeEnd == 'year') {
                    _now = new Date(now);
                    _now.setFullYear(_now.getFullYear() + 1);
                    _now.setMonth(0);
                    _now.setDate(1);
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                    end   = _now.getTime() - config.l[index].offset * 1000;
                    start = end - (config.range * 60000);
                }
            }

            option = {
                start:      start,
                end:        end,
                ignoreNull: (config.l[index].ignoreNull === undefined) ? config.ignoreNull : config.l[index].ignoreNull,
                aggregate:  config.l[index].aggregate || config.aggregate || 'm4'
            };

            if (config.aggregateType == 'step') {
                option.step = config.aggregateSpan * 1000;
            } else if (config.aggregateType == 'count') {
                option.count = config.aggregateSpan || (document.getElementById('chart_container').clientWidth / 10);
            }

            navOptions[index] = option;
            return option;

        } else {

            end   = now.getTime() - config.l[index].offset * 1000;
            start = end - step;

            option = {
                start:      start,
                end:        end,
                ignoreNull: (config.l[index].ignoreNull === undefined) ? config.ignoreNull : config.l[index].ignoreNull,
                aggregate:  config.l[index].aggregate || config.aggregate || 'm4',
                count:      1
            };

            navOptions[index].end   = end;
            navOptions[index].start = end - (config.range * 60);
            return option;
        }
    }
}

function readOneChart(id, instance, index, callback) {

    var option = getStartStop(index);
    option.instance  = instance;
    option.sessionId = sessionId;
    config.l[index].yOffset = parseFloat(config.l[index].yOffset) || 0;

    //console.log(JSON.stringify(option));
    console.log(new Date(option.start) + ' - ' + new Date(option.end));
    socket.emit('getHistory', id, option, function (err, res, stepIgnore, _sessionId) {
        if (err) window.alert(err);

        if (sessionId && _sessionId && _sessionId !== sessionId) {
            console.warn('Ignore request with sessionId=' + _sessionId + ', actual is ' + sessionId);
            return;
        }

        if (!err && res) {
            //option.ignoreNull = (config.l[index].ignoreNull === undefined) ? (config.ignoreNull === 'true' || config.ignoreNull === true) : (config.l[index].ignoreNull === 'true' || config.l[index].ignoreNull === true);
            option.yOffset = config.l[index].yOffset;

            for (var i = 0; i < res.length; i++) {
                // if less 2000.01.01 00:00:00
                if (res[i].ts < 946681200000) res[i].ts = res[i].ts * 1000;

                // Convert boolean values to numbers
                if (res[i].val === 'true' || res[i].val === true) {
                    res[i].val = 1;
                } else if (res[i].val === 'false' || res[i].val === false) {
                    res[i].val = 0;
                }
                if (typeof res[i].val == 'string') res[i].val = parseFloat(res[i].val);

                seriesData[index].push([res[i].ts, res[i].val !== null ? res[i].val + option.yOffset : null]);
            }
            // add start and end
            if (seriesData.length) {
                if (seriesData[0][0] > option.start) seriesData.unshift([option.start, null]);
                if (seriesData[seriesData.length - 1][0] < option.end) seriesData.push([option.end, null]);
            }
            // free memory
            res = null;
        }

        if (callback) callback(id, index);
    });
}

function yFormatter(y, line) {
    if (typeof y === 'boolean') return '' + y;
    if (config.l[line].afterComma !== undefined && config.l[line].afterComma !== null) {
        y = parseFloat(y);
        if (config.useComma) {
            return y.toFixed(config.l[line].afterComma).toString().replace('.', ',');
        } else {
            return y.toFixed(config.l[line].afterComma);
        }
    } else {
        if (config.useComma) {
            y = parseFloat(y);
            return y.toString().replace('.', ',');
        } else {
            return y;
        }
    }
}
/*
function readOneValue(id, index, callback) {
    socket.emit('getObject', id, function (err, res) {
        if (!err && res && res.common) {
            config.l[index].name = config.l[index].name || res.common.name;
            config.l[index].unit = config.l[index].unit || (res.common.unit ? res.common.unit.replace('�', '°') : '');
            config.l[index].type = res.common.type;
        } else {
            config.l[index].name = config.l[index].name || id;
            config.l[index].unit = config.l[index].unit || '';
        }

        socket.emit('getState', id, function (err, state) {
            if (state) {
                callback(id, index, state.val);
            } else {
                callback(id, index, null);
            }
        });
    });
}
*/

function readData(hidden) {
    if (disconnectTimeout) {
        $('#no-connection').hide();
        clearTimeout(disconnectTimeout);
        disconnectTimeout = null;
    }
    sessionId++;

    if (config.l) {
        if (!hidden) $('#server-disconnect').show();

        // todo
//            if (config.renderer == 'pie' || (config.renderer == 'bar' && config._ids.length > 1)) {
//
//                seriesData = [[]];
//                for (var j = 0; j < config._ids.length; j++) {
//                    readOneValue(config._ids[j], j, function (_id, _index, value) {
//                        if (config.renderer == 'pie') {
//                            seriesData[0][_index] = {label: config.l[_index].name, data: value};
//                        } else {
//                            seriesData[0][_index] = [config.l[_index].name, value];
//                        }
//                        if (_index == config._ids.length - 1) {
//                            buildGraph();
//                        }
//                    });
//                }
//            } else {
        var j;
        for (j = 0; j < config.l.length; j++) {
            if (config.l[j] !== '' && config.l[j] !== undefined) seriesData.push([]);
        }
        var ready = 0;

        function _readOneLine(index) {
            ready++;
            socket.emit('getObject', config.l[index].id, function (err, res) {
                if (!err && res && res.common) {
                    config.l[index].name = config.l[index].name || res.common.name;
                    config.l[index].unit = config.l[index].unit || (res.common.unit ? res.common.unit.replace('�', '°') : '');
                    config.l[index].type = res.common.type;
                } else {
                    config.l[index].name = config.l[index].name || config.l[index].id;
                    config.l[index].unit = config.l[index].unit || '';
                }
                readOneChart(config.l[index].id, config.l[index].instance, index, function () {
                    if (!--ready) {
                        $('#server-disconnect').hide();
                        buildGraph();
                    }
                });
            });
        }

        for (j = 0; j < config.l.length; j++) {
            _readOneLine(j);
        }
    }
}

function onZoom() {
    var opt = graph.getOptions();
    if (!config.zoomed) {
        $('#resetZoom').show();
        config.zoomed = true;
    }
    for (var index = 0; index < opt.xaxes.length; index++) {
        config.l[index].zMin = Math.round(opt.xaxes[index].min);
        config.l[index].zMax = Math.round(opt.xaxes[index].max);
        settings.xaxes[index].max = Math.round(opt.xaxes[index].max);
        settings.xaxes[index].min = Math.round(opt.xaxes[index].min);
    }

    console.log('on zoom');
    updateLive();
}

function tickXFormatter (number, object) {
    var now = new Date(parseInt(number, 10));
    if (config.timeFormatDate && config.timeFormatTime) {
        if (!object.ticks.length) {
            return $.plot.formatDate(now, config.timeFormatDate);
        }
        var d = new Date(object.ticks[object.ticks.length - 1].v);
        if (d.getDate() != now.getDate()) {
            return $.plot.formatDate(now, config.timeFormatDate);
        }
        return $.plot.formatDate(now, config.timeFormatTime);
    } else {
        return $.plot.formatDate(now, config.timeFormat);
    }
}

function tickYFormatter (number, object) {
    // If tickDecimals was specified, ensure that we have exactly that
    // much precision; otherwise default to the value's own precision.
    var afterComma = config.l[object.n - 1].afterComma;

    if (afterComma !== null && afterComma !== undefined) {
        var factor = afterComma ? Math.pow(10, afterComma) : 1;
        var formatted = (Math.round(number * factor) / factor).toString();
        var decimal = formatted.indexOf('.');
        var precision = decimal == -1 ? 0 : formatted.length - decimal - 1;

        if (precision < afterComma) {
            number = (precision ? formatted : formatted + '.') + factor.toString().substr(1, afterComma - precision);
        } else {
            number = formatted;
        }
    }

    if (config.useComma) number = number.toString().replace('.', ',');

    var unit = config.l[object.n - 1].unit;

    return number + (unit ? (' ' + unit) : '');
}

function buildGraph() {
    series = [];
    var smoothing = false;
    var $title = $('#title');

    if (config.title && !$title.html()) {
        $title.html(decodeURI(config.title));
        if (config.titleColor) $title.css('color',    config.titleColor);
        if (config.titleSize) $title.css('font-size', config.titleSize);
        if (config.titlePos) {
            var parts = config.titlePos.split(';');
            var css = {};
            for (var t = 0; t < parts.length; t++) {
                var p = parts[t].split(':');

                // Bottom inside
                if (p[0] == 'bottom' && p[1] == '5') {
                    if (config.height.indexOf('%') == -1) {
                        css.top = parseInt(config.height, 10) - $title.height() - 45;
                    } else {
                        css.top = 'calc(' + config.height + ' - ' + ($title.height() + 45) + 'px)';
                    }
                } else	// Bottom outside
                if (p[0] == 'bottom' && p[1] == '-5') {
                    if (config.height.indexOf('%') == -1) {
                        css.top = parseInt(config.height, 10) + 5;
                    } else {
                        css.top = 'calc(' + config.height + ' + 5px)';
                    }
                } else	// Middle
                if (p[0] == 'top' && p[1] == '50') {
                    if (config.height.indexOf('%') == -1) {
                        css.top = (parseInt(config.height, 10) - $title.height()) / 2;
                    } else {
                        css.top = 'calc(50% - ' + ($title.height() / 2) + 'px)';
                    }
                } else	// Center
                if (p[0] == 'left' && p[1] == '50') {
                    if (config.width.indexOf('%') == -1) {
                        css.left = (parseInt(config.width, 10) - $title.width()) / 2;
                    } else {
                        css.left = 'calc(50% - ' + ($title.width() / 2) + 'px)';
                    }
                } else	// Right inside
                if (p[0] == 'right' && p[1] == '5') {
                    if (config.width.indexOf('%') == -1) {
                        css.left = parseInt(config.width, 10) - $title.width() - 45;
                    } else {
                        css.left = 'calc(' + config.width + ' - ' + ($title.width() + 45) + 'px)';
                    }
                } else	// Right outside
                if (p[0] == 'right' && p[1] == '-5') {
                    if (config.width.indexOf('%') == -1) {
                        css.left = parseInt(config.width, 10) + 25;
                    } else {
                        css.left = 'calc(' + config.width + ' + 5px)';
                    }
                } else {
                    css[p[0]] = p[1];
                }
            }

            $title.css(css);
        }
    }

    // Replace background
    if (config.bg && config.bg.length < 3 && backgrounds[config.bg]) config.bg = {colors: backgrounds[config.bg]};

    //todo make bar working
//        if (config.renderer != 'bar' || config._ids.length <= 1) {

    for (var i = 0; i < seriesData.length; i++) {
        if (seriesData[i]) {

            config.l[i].chartType = config.l[i].chartType || config.chartType || 'line';

            var option = {
                color:      config.l[i].color || undefined,
                lines: {
                    show:       (config.l[i].chartType != 'scatterplot' && config.l[i].chartType != 'bar'),
                    fill:       (config.l[i].chartType == 'area' || config.l[i].chartType == 'bar'),
                    steps:      (config.l[i].chartType == 'steps'),
                    lineWidth:  config.l[i].thickness
                },
                bars: {
                    show:       (config.l[i].chartType == 'bar'),
                    barWidth:   0.6
                },
                points: {
                    show:       (config.l[i].chartType == 'lineplot' || config.l[i].chartType == 'scatterplot')
                },
                data:       seriesData[i],
                label:      config.l[i].name,
                shadowSize: config.l[i].shadowsize
            };

            if ((config.smoothing && config.smoothing > 0) || (config.l[i].smoothing && config.l[i].smoothing > 0)) {
                smoothing = true;
                config.l[i].smoothing = parseInt(config.l[i].smoothing || config.smoothing);
                option.data = $.plot.JUMlib.prepareData.avg(option.data, config.l[i].smoothing);
            } else {
                config.l[i].smoothing = 0;
            }

            config.l[i].afterComma = (config.l[i].afterComma === undefined || config.l[i].afterComma === '') ? config.afterComma : parseInt(config.l[i].afterComma, 10);

            if (config.l[i].chartType == 'bar') {
                option.bars.barWidth = (option.data[option.data.length - 1][0] - option.data[0][0]) / option.data.length * 0.5;
            }

            series.push(option);
        }
    }

    if (config.min === null || config.min === undefined || config.min === '' || config.min.toString() === 'NaN') {
        config.min = undefined;
    } else {
        config.min = parseFloat(config.min);
    }

    if (config.noBorder) {
        if (!config.width)  config.width  = '100%';
        if (!config.height) config.height = '100%';

        if (config.width.indexOf('%') != -1) {
            $('#chart_container').css({width: 'calc(' + config.width + ' - 20px)'}); // original 20px
        } else {
            $('#chart_container').css({width: config.width});
        }
        if (config.height.indexOf('%') != -1) {
            $('#chart_container').css({height: 'calc(' + config.height + ' - 20px)'});// original 20px
        } else {
            $('#chart_container').css({height: config.height});
        }

    } else {
        $('#chart_container').addClass('chart-container').css({width: config.width, height: config.height});
//            $('#chart_container').css({'padding-bottom':"100px"})
    }

    if (config.timeFormat === 'null') config.timeFormat = undefined;

    if (config.timeFormat) {
        if (config.timeFormat.indexOf('%H:%M:%S') != -1) {
            config.timeFormatTime = '%H:%M:%S';
        } else if (config.timeFormat.indexOf('%I:%M:%S') != -1) {
            config.timeFormatTime = '%I:%M:%S';
        } else if (config.timeFormat.indexOf('%H:%M') != -1) {
            config.timeFormatTime = '%H:%M';
        } else {
            config.timeFormatTime = null;
        }
        if (config.timeFormat.indexOf('%d.%m.%y') != -1) {
            config.timeFormatDate = '%d.%m.%y';
        } else if (config.timeFormat.indexOf('%x %p') != -1) {
            config.timeFormatDate = '%x %p';
        } else if (config.timeFormat.indexOf('%d/%m/%y') != -1) {
            config.timeFormatDate = '%d/%m/%y';
        } else if (config.timeFormat.indexOf('%m.%d.%y') != -1) {
            config.timeFormatDate = '%m.%d.%y';
        } else if (config.timeFormat.indexOf('%d.%m') != -1) {
            config.timeFormatDate = '%d.%m';
        } else {
            config.timeFormatDate = null;
        }
    }

//        if (config.l[i].chartType == 'pie') {
//            series.legend = {
//                show: !!config.legend,
//                position: config.legend
//            };
//            graph = $.plot("#chart_placeholder", seriesData[0], series);
//        } else if (config.l[i].chartType == 'bar' && config._ids.length > 1) {
//            var series = {
//                series: {
//                    bars: {
//                        show: config.l[i].chartType == 'bar',
//                        barWidth: 0.6,
//                        align: "center"
//                    },
//                    pie: {
//                        show: config.l[i].chartType == 'pie'
//                    },
//                    legend: {
//                        show: !!config.legend,
//                        position: config.legend
//                    }
//                }
//            };
//
//            series.xaxis = {
//                mode: "categories",
//                tickLength: 0
//            };
//
//            graph = $.plot("#chart_placeholder", [seriesData[0]], series);
//        } else {

    settings = {
        grid: {
            hoverable:       (config.hoverDetail === 'true' || config.hoverDetail === true),
            backgroundColor: config.bg || undefined
        },
        yaxes: [],
        xaxes: [],
        legend: {
            show:       !!config.legend,
            position:   config.legend,
            hideable:   true
        }
    };

    if (config.zoom) {
        $('#resetZoom').unbind('click').click(function () {
            seriesData = [];
            $('#resetZoom').hide();
            config.zoomed = false;
            now = new Date();
            readData(true);
        });
        settings.zoom = {
            interactive: true,
            trigger:    'dblclick', // or "click" for single click
            amount:     1.5         // 2 = 200% (zoom in), 0.5 = 50% (zoom out)
        };
        settings.pan = {
            interactive: true,
            cursor:     'move',     // CSS mouse cursor value used when dragging, e.g. "pointer"
            frameRate:  20
        };
    }

    for (var ii = 0; ii < config.l.length; ii++) {

        config.l[ii].yaxe = config.l[ii].yaxe || '';
        config.l[ii].xaxe = config.l[ii].xaxe || '';
        config.l[ii].commonYAxis = config.l[ii].commonYAxis || '';

        var yaxi = {
            show: config.l[ii].yaxe !== 'off',
            min:  (config.l[ii].min !== '' && config.l[ii].min !== null && config.l[ii].min !== undefined) ? parseFloat(config.l[ii].min) : undefined,
            max:  (config.l[ii].max !== '' && config.l[ii].max !== null && config.l[ii].max !== undefined) ? parseFloat(config.l[ii].max) : undefined,
            position: config.l[ii].yaxe.indexOf('left') > -1 ? 'left' : 'right',
            font: {
                color: config.l[ii].yaxe.indexOf('Color') > -1 ? config.l[ii].color : (config.y_labels_color || 'black')
            },
            zoomRange: false,  // or [ number, number ] (min range, max range) or false
            panRange:  false,  // or [ number, number ] (min, max) or false
            // to do
            /*{
             size: 11,
             lineHeight: 13,
             style: "italic",
             weight: "bold",
             family: "sans-serif",
             variant: "small-caps",
             color: "#545454"
             }*/
            //tickColor: 'red',

            tickFormatter: tickYFormatter
        };

        var xaxi = {
            show:       config.l[ii].xaxe !== 'off',
            position:   config.l[ii].xaxe.indexOf('top') !== -1 ? 'top' : 'bottom',
            font: {
                color: config.l[ii].xaxe.indexOf('Color') !== -1 ? config.l[ii].color : (config.x_labels_color || 'black')
            },
            zoomRange: null,  // or [ number, number ] (min range, max range) or false
            panRange:  null,  // or [ number, number ] (min, max) or false
            mode:       'time',
            //timeformat: config.timeFormat,
            //timezone:   "browser",
            tickFormatter: config.timeFormat ? tickXFormatter : null,
            min: undefined,
            max: undefined
        };

        if (config.zoom) {
            xaxi.zoomRange = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
            xaxi.panRange  = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
        }

        settings.yaxes.push(yaxi);
        settings.xaxes.push(xaxi);
//            settings.yaxis["y"+(ii +1)] = axi

        // Support for commonYAxis
        if (config.l[ii].commonYAxis !== '') {
            series[ii].yaxis = parseInt(config.l[ii].commonYAxis);
        } else {
            series[ii].yaxis = ii + 1;
        }
        series[ii].xaxis = ii + 1;
    }

    if (smoothing) {
        settings.series = {
            curvedLines: {
                apply:          true,
                active:         true,
                monotonicFit:   true
            }
        };
    }

    graph = $.plot('#chart_placeholder', series, settings);

    // Hoover
    if (config.hoverDetail === 'true' || config.hoverDetail === true) {
        $('#chart_placeholder').unbind('plothover').bind('plothover', function (event, pos, item) {
            if (item) {
                var x = item.datapoint[0].toFixed(2);
                var y;

                if (config.l[item.seriesIndex].type === 'boolean') {
                    y = !!Math.round(item.datapoint[1] - config.l[item.seriesIndex].yOffset);
                } else {
                    y = (item.datapoint[1] - config.l[item.seriesIndex].yOffset).toFixed(2);
                }

                var text = item.series.label ? item.series.label + '<br>' : '';
                text += $.plot.formatDate(new Date(parseInt(x, 10)), config.timeFormat) + '<br>';
                text += '<b>' + yFormatter(y, item.seriesIndex) + '</b>';

                var $tooltip = $('#tooltip').html(text);
                if ($(this).height() - item.pageY < $tooltip.height()) {
                    item.pageY -= 10 + $tooltip.height();
                }
                if ($(this).width() - item.pageX < $tooltip.width()) {
                    item.pageX -= 10 + $tooltip.width();
                }
                $tooltip.css({top: item.pageY + 5, left: item.pageX + 5}).fadeIn(200);
            } else {
                $('#tooltip').hide();
            }
        });

        if (!$('#tooltip').length) {
            $('<div id="tooltip"></div>').css({
                position:   'absolute',
                display:    'none',
                border:     '1px solid #fdd',
                padding:    '2px',
                'background-color': '#fee',
                opacity:    0.80
            }).appendTo('body');
        }
    }

    if (config.live && config.timeType == 'relative') {
        if (config.live === true || config.live === 'true') config.live = 30;
        config.live = parseInt(config.live, 10) || 30;
        startLiveUpdate();
    }

    if (config.zoom) {
        // handlers for zoom and pan
        $('#chart_placeholder').unbind('plotzoom').bind('plotzoom', function (e, plot, args) {
            if (zoomTimeout) clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(onZoom, 500);
        }).unbind('plotpan').bind('plotpan', function (e, plot, args) {
            if (zoomTimeout) clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(onZoom, 500);
        })
        .unbind('touchstart')
        .on('touchstart', function (e) {
            e.preventDefault();
            mouseDown = true;
            var touches = e.touches || e.originalEvent.touches;
            if (touches) {
                lastX = touches[touches.length - 1].pageX;
                if (touches.length > 1) {
                    lastWidth = Math.abs(touches[0].pageX - touches[1].pageX);
                } else {
                    lastWidth = null;
                }
            }
        })
        .unbind('touchend')
        .on('touchend', function(e) {
            e.preventDefault();
            mouseDown = false;
            if (zoomTimeout) clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(onZoom, 500);
        })
        .unbind('touchmove')
        .on('touchmove', function (e) {
            e.preventDefault();
            var touches = e.touches || e.originalEvent.touches;
            if (!touches) return;
            if (mouseDown) {
                var pageX = touches[touches.length - 1].pageX;
                if (touches.length > 1) {
                    // zoom
                    var width = Math.abs(touches[0].pageX - touches[1].pageX);

                    if (lastWidth !== null && width !== lastWidth) {
                        var amount     = (width > lastWidth) ? 1.1 : 0.9;
                        var offset     = graph.offset();
                        var positionX  = (touches[0].pageX > touches[1].pageX) ? (touches[1].pageX + width / 2) : (touches[0].pageX + width / 2);

                        graph.zoom({
                            center: {
                                left:   positionX - offset.left,
                                height: graph.height() / 2
                            },
                            amount: amount
                        });

                        if (zoomTimeout) clearTimeout(zoomTimeout);
                        zoomTimeout = setTimeout(onZoom, 500);
                    }
                    lastWidth = width;
                } else {
                    // swipe
                    graph.pan({left: lastX - pageX, top: 0});
                }
            }
            lastX = pageX;
        });
    }
}

function updateLive() {
    var ready = 0;
    now = new Date();
    $('.loader').show();
    sessionId++;

    for (var index = 0; index < config.l.length; index++) {
        if (config.zoom) {
            settings.xaxes[index].zoomRange = [null, now.getTime()];
            settings.xaxes[index].panRange  = [null, now.getTime()];
        }
        ready++;
        seriesData[index] = [];
        readOneChart(config.l[index].id, config.l[index].instance, index, function () {
            if (!--ready) {
                for (var _index = 0; _index < config.l.length; _index++) {
                    series[_index].data = seriesData[_index];
                }
                graph = $.plot('#chart_placeholder', series, settings);
                $('.loader').hide();
            }
        });
    }
}

function startLiveUpdate() {
    liveInterval = setInterval(function () {
        if (config.zoomed) {
            var opt = graph.getOptions();
            var max = 0;
            var min = null;
            for (var index = 0; index < opt.xaxes.length; index++) {
                if (max < config.l[index].zMax) max = config.l[index].zMax;
                if (min === null || min > config.l[index].zMin) min = config.l[index].zMin;
            }
            // if 20%
            if ((max + ((max - min) / 20)) >= new Date().getTime()) {
                max = new Date().getTime() - now.getTime();
                for (var _index = 0; _index < opt.xaxes.length; _index++) {
                    config.l[_index].zMax += max;
                    config.l[_index].zMin += max;
                    settings.xaxes[_index].min = config.l[_index].zMin;
                    settings.xaxes[_index].max = config.l[_index].zMax;
                }
            } else {
                return;
            }
        }

        console.log('on time');
        updateLive();
    }, config.live * 1000);
}
