"use strict";

var _config; // quasi local variable
var series;
var settings;

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

function yFormatter(y, line) {
    if (typeof y === 'boolean') return '' + y;
    var unit = _config.l[line].unit ? ' ' + _config.l[line].unit : '';
    if (_config.l[line].afterComma !== undefined && _config.l[line].afterComma !== null) {
        y = parseFloat(y);
        if (_config.useComma) {
            return y.toFixed(_config.l[line].afterComma).toString().replace('.', ',') + unit;
        } else {
            return y.toFixed(_config.l[line].afterComma) + unit;
        }
    } else {
        if (_config.useComma) {
            y = parseFloat(y);
            return y.toString().replace('.', ',') + unit;
        } else {
            return y + unit;
        }
    }
}

function tickXFormatter (number, object) {
    var now = new Date(parseInt(number, 10));
    if (_config.timeFormatDate && _config.timeFormatTime) {
        if (!object.ticks.length) {
            return $.plot.formatDate(now, _config.timeFormatDate);
        }
        var d = new Date(object.ticks[object.ticks.length - 1].v);
        if (d.getDate() != now.getDate()) {
            return $.plot.formatDate(now, _config.timeFormatDate);
        }
        return $.plot.formatDate(now, _config.timeFormatTime);
    } else {
        return $.plot.formatDate(now, _config.timeFormat);
    }
}

function tickYFormatter (number, object) {
    // If tickDecimals was specified, ensure that we have exactly that
    // much precision; otherwise default to the value's own precision.
    var afterComma = _config.l[object.n - 1].afterComma;

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

    if (_config.useComma) number = number.toString().replace('.', ',');

    var unit = _config.l[object.n - 1].unit;

    return number + (unit ? (' ' + unit) : '');
}

function buildGraph(__config) {
    series = [];
    _config = __config;
    var smoothing = false;
    var $title = $('#title');

    if (__config.title && !$title.html()) {
        $title.html(decodeURI(__config.title));
        if (__config.titleColor) $title.css('color',    __config.titleColor);
        if (__config.titleSize) $title.css('font-size', __config.titleSize);
        if (__config.titlePos) {
            var parts = __config.titlePos.split(';');
            var css = {};
            for (var t = 0; t < parts.length; t++) {
                var p = parts[t].split(':');

                // Bottom inside
                if (p[0] == 'bottom' && p[1] == '5') {
                    if (__config.height.indexOf('%') == -1) {
                        css.top = parseInt(__config.height, 10) - $title.height() - 45;
                    } else {
                        css.top = 'calc(' + __config.height + ' - ' + ($title.height() + 45) + 'px)';
                    }
                } else	// Bottom outside
                if (p[0] == 'bottom' && p[1] == '-5') {
                    if (__config.height.indexOf('%') == -1) {
                        css.top = parseInt(__config.height, 10) + 5;
                    } else {
                        css.top = 'calc(' + __config.height + ' + 5px)';
                    }
                } else	// Middle
                if (p[0] == 'top' && p[1] == '50') {
                    if (__config.height.indexOf('%') == -1) {
                        css.top = (parseInt(__config.height, 10) - $title.height()) / 2;
                    } else {
                        css.top = 'calc(50% - ' + ($title.height() / 2) + 'px)';
                    }
                } else	// Center
                if (p[0] == 'left' && p[1] == '50') {
                    if (__config.width.indexOf('%') == -1) {
                        css.left = (parseInt(__config.width, 10) - $title.width()) / 2;
                    } else {
                        css.left = 'calc(50% - ' + ($title.width() / 2) + 'px)';
                    }
                } else	// Right inside
                if (p[0] == 'right' && p[1] == '5') {
                    if (__config.width.indexOf('%') == -1) {
                        css.left = parseInt(__config.width, 10) - $title.width() - 45;
                    } else {
                        css.left = 'calc(' + __config.width + ' - ' + ($title.width() + 45) + 'px)';
                    }
                } else	// Right outside
                if (p[0] == 'right' && p[1] == '-5') {
                    if (__config.width.indexOf('%') == -1) {
                        css.left = parseInt(__config.width, 10) + 25;
                    } else {
                        css.left = 'calc(' + __config.width + ' + 5px)';
                    }
                } else {
                    css[p[0]] = p[1];
                }
            }

            $title.css(css);
        }
    }

    // Replace background
    if (__config.bg && __config.bg.length < 3 && backgrounds[__config.bg]) __config.bg = {colors: backgrounds[__config.bg]};

    //todo make bar working
//        if (__config.renderer != 'bar' || __config._ids.length <= 1) {

    for (var i = 0; i < seriesData.length; i++) {
        if (seriesData[i]) {

            __config.l[i].chartType = __config.l[i].chartType || __config.chartType || 'line';

            var option = {
                color:      __config.l[i].color || undefined,
                lines: {
                    show:       (__config.l[i].chartType !== 'scatterplot' && __config.l[i].chartType !== 'bar'),
                    fill:       (__config.l[i].chartType === 'area' || __config.l[i].chartType == 'bar'),
                    steps:      (__config.l[i].chartType === 'steps'),
                    lineWidth:  __config.l[i].thickness
                },
                bars: {
                    show:       (__config.l[i].chartType === 'bar'),
                    barWidth:   0.6,
                    align:      'center'
                },
                points: {
                    show:       (__config.l[i].chartType == 'lineplot' || __config.l[i].chartType == 'scatterplot')
                },
                data:       seriesData[i],
                label:      __config.l[i].name,
                shadowSize: __config.l[i].shadowsize
            };

            if ((__config.smoothing && __config.smoothing > 0) || (__config.l[i].smoothing && __config.l[i].smoothing > 0)) {
                smoothing = true;
                __config.l[i].smoothing = parseInt(__config.l[i].smoothing || __config.smoothing);
                option.data = avg(option.data, __config.l[i].smoothing);
            } else {
                __config.l[i].smoothing = 0;
            }

            __config.l[i].afterComma = (__config.l[i].afterComma === undefined || __config.l[i].afterComma === '') ? __config.afterComma : parseInt(__config.l[i].afterComma, 10);

            if (__config.l[i].chartType === 'bar') {
                option.bars.barWidth = (option.data[option.data.length - 1][0] - option.data[0][0]) / option.data.length * 0.5;
            }
/*
            if (__config.l[i].chartType == 'pie') {
                series.legend = {
                    show:   !!__config.legend,
                    position: __config.legend
                };
            } else if (__config.l[i].chartType === 'bar') {
                var series = {
                    series: {
                        bars: {
                            show: __config.l[i].chartType == 'bar',
                            barWidth: 0.6,
                            align: "center"
                        },
                        pie: {
                            show: __config.l[i].chartType == 'pie'
                        },
                        legend: {
                            show: !!__config.legend,
                            position: __config.legend
                        }
                    }
                };
*/

                series.push(option);
        }
    }

    if (__config.min === null || __config.min === undefined || __config.min === '' || __config.min.toString() === 'NaN') {
        __config.min = undefined;
    } else {
        __config.min = parseFloat(__config.min);
    }

    if (__config.noBorder) {
        if (!__config.width)  __config.width  = '100%';
        if (!__config.height) __config.height = '100%';

        if (__config.width.indexOf('%') != -1) {
            $('#chart_container').css({width: 'calc(' + __config.width + ' - 20px)'}); // original 20px
        } else {
            $('#chart_container').css({width: __config.width});
        }
        if (__config.height.indexOf('%') != -1) {
            $('#chart_container').css({height: 'calc(' + __config.height + ' - 20px)'});// original 20px
        } else {
            $('#chart_container').css({height: __config.height});
        }

    } else {
        $('#chart_container').addClass('chart-container').css({width: __config.width, height: __config.height});
//            $('#chart_container').css({'padding-bottom':"100px"})
    }

    if (__config.timeFormat === 'null') __config.timeFormat = undefined;

    if (__config.timeFormat) {
        if (__config.timeFormat.indexOf('%H:%M:%S') != -1) {
            __config.timeFormatTime = '%H:%M:%S';
        } else if (__config.timeFormat.indexOf('%I:%M:%S') != -1) {
            __config.timeFormatTime = '%I:%M:%S';
        } else if (__config.timeFormat.indexOf('%H:%M') != -1) {
            __config.timeFormatTime = '%H:%M';
        } else {
            __config.timeFormatTime = null;
        }
        if (__config.timeFormat.indexOf('%d.%m.%y') != -1) {
            __config.timeFormatDate = '%d.%m.%y';
        } else if (__config.timeFormat.indexOf('%x %p') != -1) {
            __config.timeFormatDate = '%x %p';
        } else if (__config.timeFormat.indexOf('%d/%m/%y') != -1) {
            __config.timeFormatDate = '%d/%m/%y';
        } else if (__config.timeFormat.indexOf('%m.%d.%y') != -1) {
            __config.timeFormatDate = '%m.%d.%y';
        } else if (__config.timeFormat.indexOf('%d.%m') != -1) {
            __config.timeFormatDate = '%d.%m';
        } else {
            __config.timeFormatDate = null;
        }
    }

    settings = {
        grid: {
            hoverable:       (__config.hoverDetail === 'true' || __config.hoverDetail === true),
            backgroundColor: __config.bg || undefined
        },
        yaxes: [],
        xaxes: [],
        legend: {
            show:       !!__config.legend,
            position:   __config.legend,
            hideable:   true
        }
    };

    if (__config.zoom) {
        $('#resetZoom').unbind('click').click(function () {
            seriesData = [];
            $('#resetZoom').hide();
            __config.zoomed = false;
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

    for (var ii = 0; ii < __config.l.length; ii++) {

        __config.l[ii].yaxe = __config.l[ii].yaxe || '';
        __config.l[ii].xaxe = __config.l[ii].xaxe || '';
        __config.l[ii].commonYAxis = __config.l[ii].commonYAxis || '';

        var yaxi = {
            show: __config.l[ii].yaxe !== 'off',
            min:  (__config.l[ii].min !== '' && __config.l[ii].min !== null && __config.l[ii].min !== undefined) ? parseFloat(__config.l[ii].min) : undefined,
            max:  (__config.l[ii].max !== '' && __config.l[ii].max !== null && __config.l[ii].max !== undefined) ? parseFloat(__config.l[ii].max) : undefined,
            position: __config.l[ii].yaxe.indexOf('left') > -1 ? 'left' : 'right',
            font: {
                color: __config.l[ii].yaxe.indexOf('Color') > -1 ? __config.l[ii].color : (__config.y_labels_color || 'black')
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
            show:       __config.l[ii].xaxe !== 'off',
            position:   __config.l[ii].xaxe.indexOf('top') !== -1 ? 'top' : 'bottom',
            font: {
                color: __config.l[ii].xaxe.indexOf('Color') !== -1 ? __config.l[ii].color : (__config.x_labels_color || 'black')
            },
            zoomRange: null,  // or [ number, number ] (min range, max range) or false
            panRange:  null,  // or [ number, number ] (min, max) or false
            mode:      'time',
            //timeformat: __config.timeFormat,
            //timezone:   "browser",
            tickFormatter: __config.timeFormat ? tickXFormatter : null,
            minTickSize: (__config.l[ii].chartType === 'bar') ? series[ii].bars.barWidth : undefined,
            min: undefined,
            max: undefined
        };

        // why ??
        if (__config.l[ii].chartType === 'bar') {
            settings.legend.hideable = false;
        }

        if (__config.zoom) {
            xaxi.zoomRange = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
            xaxi.panRange  = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
        }

        settings.yaxes.push(yaxi);
        settings.xaxes.push(xaxi);

        // Support for commonYAxis
        if (__config.l[ii].commonYAxis !== '') {
            series[ii].yaxis = parseInt(__config.l[ii].commonYAxis);
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

    var graph = $.plot('#chart_placeholder', series, settings);

    // Hoover
    if (__config.hoverDetail === 'true' || __config.hoverDetail === true) {
        $('#chart_placeholder').unbind('plothover').bind('plothover', function (event, pos, item) {
            if (item) {
                var x = item.datapoint[0].toFixed(2);
                var y;

                if (__config.l[item.seriesIndex].type === 'boolean') {
                    y = !!Math.round(item.datapoint[1] - __config.l[item.seriesIndex].yOffset);
                } else {
                    y = (item.datapoint[1] - __config.l[item.seriesIndex].yOffset).toFixed(2);
                }

                var text = item.series.label ? item.series.label + '<br>' : '';
                text += $.plot.formatDate(new Date(parseInt(x, 10)), __config.timeFormat) + '<br>';
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

    if (__config.live && __config.timeType == 'relative') {
        if (__config.live === true || __config.live === 'true') __config.live = 30;
        __config.live = parseInt(__config.live, 10) || 30;
        startLiveUpdate();
    }

    if (__config.zoom) {
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

    return graph;
}

function updateChart(seriesData) {
    for (var _index = 0; _index < config.l.length; _index++) {
        series[_index].data = seriesData[_index];
    }
    return $.plot('#chart_placeholder', series, settings);
}

function readZoomSettingsPerLine(graph) {
    var opt = graph.getOptions();
    var result = [];
    for (var index = 0; index < opt.xaxes.length; index++) {
        result[index] = {
            min: Math.round(opt.xaxes[index].min),
            max: Math.round(opt.xaxes[index].max)
        };
        settings.xaxes[index].max = result[index].max;
        settings.xaxes[index].min = result[index].min
    }
    return result;
}

function resetZoom(index, time) {
    settings.xaxes[index].zoomRange = [null, time.getTime()];
    settings.xaxes[index].panRange  = [null, time.getTime()];
}

function setRangeForLine(index, min, max) {
    settings.xaxes[index].min = min;
    settings.xaxes[index].max = max;
}



