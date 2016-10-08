'use strict';

// Show "no connection" message after 5 seconds
var disconnectTimeout = setTimeout(function () {
    disconnectTimeout = null;
    //Show disconnected message
    $('#no-connection').show();
}, 5000);

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
//        "aggregate" : "minmax",
//        "color" : "#FF0000",
//        "thickness" : "3"
//      }, {
//        "id" : "system.adapter.email.0.memRss",
//        "offset" : "0",
//        "aggregate" : "minmax",
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
config.timeFormat   = config.timeFormat || '%H:%M:%S %e.%m.%y';
config.useComma     = config.useComma  === 'true' || config.useComma  === true;
config.zoom         = config.zoom      === 'true' || config.zoom      === true;
config.animation    = parseInt(config.animation)  || 0;
config.noedit       = config.noedit    === 'true' || config.noedit    === true;
config.afterComma   = (config.afterComma === undefined) ? 2 : parseInt(config.afterComma, 10);
config.timeType     = config.timeArt || config.timeType || 'relative';
//    if ((config.max !== undefined && config.max !== '' && config.max !== null && parseFloat(config.max) != NaN)) config.max = parseFloat(config.max);
var seriesData      = [];
var liveInterval;

var navOptions      = {};
var socketURL       = '';
var socketSESSION   = '';
var now             = new Date();
var divId           = 'chart_placeholder';

// for zoom
var zoomTimeout     = null;
var lastX           = null;
var mouseDown       = false;
var lastWidth       = null;
var chart           = null;

var isApp           = false;
var subscribes      = [];
var subscribed      = false;
// because of security issue
try {
    if ((window.top !== window.self) && (typeof window.top.app !== 'undefined') && (typeof window.top.socketUrl !== 'undefined')) {
        isApp = true;
    }
} catch (e) {

}

if (isApp) {
	socketURL = window.top.socketUrl; // if flot runs in iframe inside the app use the socketURL determined by app.js
} else {
	if (typeof socketUrl !== 'undefined') {
		socketURL = socketUrl;
		if (socketURL && socketURL[0] === ':') {
			socketURL = 'http://' + location.hostname + socketURL;
		}
		socketSESSION = socketSession;
	}
}
var socket = io.connect(socketURL, {
    'query':                        'key=' + socketSESSION,
    'reconnection limit':           10000,
    'max reconnection attempts':    Infinity,
    upgrade:                        typeof socketForceWebSockets !== 'undefined' ? !socketForceWebSockets : undefined,
    rememberUpgrade:                typeof socketForceWebSockets !== 'undefined' ? socketForceWebSockets  : undefined,
    transports:                     typeof socketForceWebSockets !== 'undefined' ? (socketForceWebSockets ? ['websocket'] : undefined)  : undefined
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

socket.on('stateChange', function (id, state) {
    console.log(id + ' - ' + state.val);
    for (var m = 0; m < config.m.length; m++) {
        if (config.m[m].oid === id) {
            config.m[m].v = parseFloat(state.val) || 0;
        }
        if (config.m[m].oidl === id) {
            config.m[m].vl = parseFloat(state.val) || 0;
        }
    }
    chart.update(null, config.m);
});

if (config.window_bg) $('body').css('background', config.window_bg);

socket.on('disconnect', function () {
    if (!disconnectTimeout) {
        disconnectTimeout = setTimeout(function () {
            disconnectTimeout = null;
            //Show disconnected message
            $('#no-connection').show();
        }, 5000);
    }
});

function addTime(time, offset, plusOrMinus, isOffsetInMinutes) {
    time = new Date(time);

    if (typeof offset === 'string') {
        if (offset[1] === 'm') {
            offset = parseInt(offset, 10);
            time.setMonth(plusOrMinus ? time.getMonth() + offset : time.getMonth() - offset);
            time = time.getTime();
        } else if (offset[1] === 'y') {
            offset = parseInt(offset, 10);
            time.setFullYear(plusOrMinus ? time.getFullYear() + offset : time.getFullYear() - offset);
            time = time.getTime();
        } else {
            time  = time.getTime();
            if (isOffsetInMinutes) {
                if (plusOrMinus) {
                    time += (parseInt(offset, 10) || 0) * 60000;
                } else {
                    time -= (parseInt(offset, 10) || 0) * 60000;
                }

            } else {
                if (plusOrMinus) {
                    time += (parseInt(offset, 10) || 0) * 1000;
                } else {
                    time -= (parseInt(offset, 10) || 0) * 1000;
                }
            }
        }
    } else {
        time  = time.getTime();
        if (isOffsetInMinutes) {
            if (plusOrMinus) {
                time += (parseInt(offset, 10) || 0) * 60000;
            } else {
                time -= (parseInt(offset, 10) || 0) * 60000;
            }

        } else {
            if (plusOrMinus) {
                time += (parseInt(offset, 10) || 0) * 1000;
            } else {
                time -= (parseInt(offset, 10) || 0) * 1000;
            }
        }
    }
    return time;
}

function getStartStop(index, step) {
    var option = {};
    var end;
    var start;
    var _now;
    config.l[index].offset = config.l[index].offset || 0;

    // check config range
    if (config.range[1] === 'm' && config.l.length > 1) {
        for (var a = 0; a < config.l.length; a++) {
            if (config.l[a].offset && config.l[a].offset !== 0) {
                // Check what the month has first index
                _now = addTime(now, config.l[0].offset);
                var minusMonth = new Date(_now);
                minusMonth.setMonth(minusMonth.getMonth() - 1);
                config.range = Math.floor((_now - minusMonth.getTime()) / 60000) + '';
                break;
            }
        }
    }

    if (config.zoomed) {
        navOptions[index].end   = config.l[index].zMax;
        navOptions[index].start = config.l[index].zMin;
        return navOptions[index];
    } else {
        if (!step) {
            if (config.timeType === 'static') {
                var startTime;
                var endTime;
                var y;
                var m;
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
                start = new Date(config.start).setHours(startTime[0], startTime[1]);
                end   = new Date(config.end)  .setHours(endTime[0],   endTime[1]);
                start = addTime(start, config.l[index].offset);
                end   = addTime(end,   config.l[index].offset);
            } else {
                if (config.relativeEnd === 'now') {
                    _now = new Date(now);
                } else if (config.relativeEnd.indexOf('minute') !== -1) {
                    var minutes = parseInt(config.relativeEnd, 10) || 1;
                    _now = new Date(now);
                    _now.setMinutes(Math.floor(_now.getMinutes() / minutes) * minutes + minutes);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                }  else if (config.relativeEnd.indexOf('hour') !== -1) {
                    var hours = parseInt(config.relativeEnd, 10) || 1;
                    _now = new Date(now);
                    _now.setHours(Math.floor(_now.getHours() / hours) * hours + hours);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                } else if (config.relativeEnd === 'today') {
                    _now = new Date(now);
                    _now.setDate(_now.getDate() + 1);
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                } else if (config.relativeEnd === 'weekUsa') {
                    //var week = parseInt(config.relativeEnd, 10) || 1;
                    _now = new Date(now);
                    _now.setDate(_now.getDate() - _now.getDay() + 7);
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                } else if (config.relativeEnd === 'weekEurope') {
                    //var _week = parseInt(config.relativeEnd, 10) || 1;
                    _now = new Date(now);
                    // If
                    if (_now.getDay() === 0) {
                        _now.setDate(_now.getDate() + 1);
                    } else {
                        _now.setDate(_now.getDate() - _now.getDay() + 8);
                    }
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                } else if (config.relativeEnd === 'month') {
                    _now = new Date(now);
                    _now.setMonth(_now.getMonth() + 1);
                    _now.setDate(1);
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                } else if (config.relativeEnd === 'year') {
                    _now = new Date(now);
                    _now.setFullYear(_now.getFullYear() + 1);
                    _now.setMonth(0);
                    _now.setDate(1);
                    _now.setHours(0);
                    _now.setMinutes(0);
                    _now.setSeconds(0);
                    _now.setMilliseconds(0);
                }

                end   = addTime(_now, config.l[index].offset);
                start = addTime(end,  config.range, false, true);
            }

            option = {
                start:      start,
                end:        end,
                ignoreNull: (config.l[index].ignoreNull === undefined) ? config.ignoreNull : config.l[index].ignoreNull,
                aggregate:  config.l[index].aggregate || config.aggregate || 'minmax'
            };

            if (config.aggregateType === 'step') {
                option.step = config.aggregateSpan * 1000;
            } else if (config.aggregateType === 'count') {
                option.count = config.aggregateSpan || (document.getElementById('chart_container').clientWidth / 10);
            }

            navOptions[index] = option;
            return option;

        } else {
            end   = addTime(now, config.l[index].offset);
            start = end - step;

            option = {
                start:      start,
                end:        end,
                ignoreNull: (config.l[index].ignoreNull === undefined) ? config.ignoreNull : config.l[index].ignoreNull,
                aggregate:  config.l[index].aggregate || config.aggregate || 'minmax',
                count:      1
            };

            navOptions[index].end   = end;
            navOptions[index].start = addTime(end, config.range, false, true);
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

            var _series = seriesData[index];

            for (var i = 0; i < res.length; i++) {
                // if less 2000.01.01 00:00:00
                if (res[i].ts < 946681200000) res[i].ts = res[i].ts * 1000;

                // Convert boolean values to numbers
                if (res[i].val === 'true' || res[i].val === true) {
                    res[i].val = 1;
                } else if (res[i].val === 'false' || res[i].val === false) {
                    res[i].val = 0;
                }
                if (typeof res[i].val === 'string') res[i].val = parseFloat(res[i].val);

                _series.push([res[i].ts, res[i].val !== null ? res[i].val + option.yOffset : null]);
            }
            // add start and end
            if (_series.length) {
                if (_series[0][0] > option.start) _series.unshift([option.start, null]);
                if (_series[_series.length - 1][0] < option.end) _series.push([option.end, null]);
            } else {
                _series.push([option.start, null]);
                _series.push([option.end,   null]);
            }
            // free memory
            res = null;
        }

        if (callback) callback(id, index);
    });
}

function readValue(id, index, callback) {
    socket.emit('getState', id, function (err, state) {
        if (state) {
            callback(index, parseFloat(state.val) || 0);
        } else {
            callback(index, 0);
        }
    });
}

function prepareChart() {
    chart = new CustomChart({
        chartId:    divId,
        titleId:    'title',
        tooltipId:  'tooltip',
        cbOnZoom:   onZoom
    }, config, seriesData, config.m);
    
    if (config.zoom) {
        $('#resetZoom').unbind('click').click(function () {
            seriesData = [];
            $('#resetZoom').hide();
            config.zoomed = false;
            now = new Date();
            readData(true);
        });
            
        // handlers for zoom and pan
        $('#' + divId)
            // flot can pan and zoom with mouse itself
            /*.unbind('mousedown')
            .mousedown(function (e) {
                mouseDown = true;
                lastX = e.pageX;
            })
            .unbind('mouseup').mouseup(function () {
                mouseDown = false;
                if (zoomTimeout) clearTimeout(zoomTimeout);
                zoomTimeout = setTimeout(onZoom, 500);
            })
            .unbind('mousemove')
            .mousemove(function(e) {
                if (mouseDown) {
                    chart.pan(e.pageX - lastX);
                }
                lastX = e.pageX;
            })
            .unbind('mousewheel DOMMouseScroll')
            .bind('mousewheel DOMMouseScroll', function(event) {
                var amount = (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) ? 0.9 : 1.1;
                chart.zoom(event.originalEvent.pageX, amount);
                if (zoomTimeout) clearTimeout(zoomTimeout);
                zoomTimeout = setTimeout(onZoom, 500);
            })*/
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
                            var positionX  = (touches[0].pageX > touches[1].pageX) ? (touches[1].pageX + width / 2) : (touches[0].pageX + width / 2);

                            chart.zoom(positionX, amount);
                            
                            if (zoomTimeout) clearTimeout(zoomTimeout);
                            zoomTimeout = setTimeout(onZoom, 500);
                        }
                        lastWidth = width;
                    } else {
                        // swipe
                        chart.pan(lastX - pageX);
                    }
                }
                lastX = pageX;
            });
    }

    if (config.live && config.timeType === 'relative') {
        if (config.live === true || config.live === 'true') config.live = 30;
        config.live = parseInt(config.live, 10) || 30;
        startLiveUpdate();
    }
}

function _readOneLine(index, cb) {
    socket.emit('getObject', config.l[index].id, function (err, res) {
        if (!err && res && res.common) {
            config.l[index].name = config.l[index].name || res.common.name;
            config.l[index].unit = config.l[index].unit || (res.common.unit ? res.common.unit.replace('�', '°') : '');
            config.l[index].type = res.common.type;
        } else {
            config.l[index].name = config.l[index].name || config.l[index].id;
            config.l[index].unit = config.l[index].unit || '';
        }
        readOneChart(config.l[index].id, config.l[index].instance, index, cb);
    });
}

function readMarkings(cb) {
    var count = 0;
    if (config.m && config.m.length) {
        for (var m = 0; m < config.m.length; m++) {
            if (!config.m[m].oid && config.m[m].v && parseFloat(config.m[m].v) != config.m[m].v && config.m[m].v.indexOf('.') !== -1) {
                count++;
                if (subscribes.indexOf(config.m[m].v) === -1) subscribes.push(config.m[m].v);
                readValue(config.m[m].v, m, function (index, val) {
                    config.m[index].oid = config.m[index].v;
                    config.m[index].v   = val;
                    if (!--count) cb();
                });
            }
            if (!config.m[m].oidl && config.m[m].vl && parseFloat(config.m[m].vl) != config.m[m].vl && config.m[m].vl.indexOf('.') !== -1) {
                count++;
                if (subscribes.indexOf(config.m[m].vl) === -1) subscribes.push(config.m[m].vl);
                readValue(config.m[m].vl, m, function (index, val) {
                    config.m[index].oidl = config.m[index].vl;
                    config.m[index].vl   = val;
                    if (!--count) cb();
                });
            }
        }
        if (!count) cb();
    } else {
        cb();
    }
}

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
//            if (config.renderer === 'pie' || (config.renderer === 'bar' && config._ids.length > 1)) {
//
//                seriesData = [[]];
//                for (var j = 0; j < config._ids.length; j++) {
//                    readOneValue(config._ids[j], j, function (_id, _index, value) {
//                        if (config.renderer === 'pie') {
//                            seriesData[0][_index] = {label: config.l[_index].name, data: value};
//                        } else {
//                            seriesData[0][_index] = [config.l[_index].name, value];
//                        }
//                        if (_index === config._ids.length - 1) {
//                            graphCreate(divId, );
//                        }
//                    });
//                }
//            } else {
        var j;
        var ready = config.l.length;
        for (j = 0; j < config.l.length; j++) {
            if (config.l[j] !== '' && config.l[j] !== undefined) seriesData.push([]);

            _readOneLine(j, function () {
                if (!--ready) {
                    readMarkings(function () {
                        if (!subscribed) {
                            subscribed = true;
                            if (subscribes.length) {
                                for (var s = 0; s < subscribes.length; s++) {
                                    socket.emit('subscribe', subscribes[s]);
                                }
                            }
                        }

                        $('#server-disconnect').hide();
                        prepareChart();
                    });
                }
            });
        }
    }

    if (!config.noedit) {
        // install edit button
        $('#edit')
            .show()
            .click(function () {
                var win = window.open(location.href.replace('index.html', 'edit.html'), 'flot');
                win.focus();
            });
    }
}

function startLiveUpdate() {
    liveInterval = setInterval(function () {
        if (config.zoomed) {
            var max = 0;
            var min = null;
            
            // Find min and max of all lines
            for (var index = 0; index < config.l.length; index++) {
                if (max < config.l[index].zMax) max = config.l[index].zMax;
                if (min === null || min > config.l[index].zMin) min = config.l[index].zMin;
            }
            
            // if 20%
            if ((max + ((max - min) / 20)) >= new Date().getTime()) {
                max = new Date().getTime() - now.getTime();
                var result = [];
                for (var _index = 0; _index < config.l.length; _index++) {
                    config.l[_index].zMax += max;
                    config.l[_index].zMin += max;
                    result.push({min: config.l[_index].zMin, max: config.l[_index].zMax});
                }
                chart.setRange(result);
            } else {
                return;
            }
        }

        console.log('on time');
        updateLive();
    }, config.live * 1000);
}

function updateLive() {
    var ready = 0;
    now = new Date();
    $('.loader').show();
    sessionId++;

    if (config.zoom) chart.resetZoom(now);
    
    for (var index = 0; index < config.l.length; index++) {
        ready++;
        seriesData[index] = [];
        readOneChart(config.l[index].id, config.l[index].instance, index, function () {
            if (!--ready) {
                chart.update(seriesData);
                $('.loader').hide();
            }
        });
    }
}

function avg(data, range) {
    var r = [];
    var rd = [];
    var i1;
    var s;
    for(var i = 0; i < data.length; i++) {
        if (i < range) {
            i1 = 0;
        } else {
            i1 = i - range + 1;
        }
        rd = [];
        rd[0] = data[i][0];
        if (data[i][1] !== null) {
            s = 0;
            for(var j = i1; j <= i; j++) {
                if (data[j][1] === null) continue;
                s += data[j][1];
            }
            rd[1] = (s / (i - i1 + 1));
        } else {
            rd[1] = null;
        }
        r.push(rd);
    }
    return r;
}

function onZoom() {
    if (!config.zoomed) {
        $('#resetZoom').show();
        config.zoomed = true;
    }
    
    var result = chart.getRange();

    for (var r = 0; r < result.length; r++) {
        config.l[r].zMin = result[r].min;
        config.l[r].zMax = result[r].max;
    }

    console.log('on zoom');
    updateLive();
}
