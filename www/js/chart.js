//options: {
//   chartId: 
//   titleId:
//   tooltipId:
//   cbOnZoom:
// }

function CustomChart(options, config, seriesData, markLines, ticks) {
    'use strict';
    
    if (!(this instanceof CustomChart)) return new CustomChart(options, config, seriesData, markLines, ticks);
    
    this.chart   = null;
    this.config  = config;
    this.options = options;
    
    var that     = this;
    var series;
    var markingsOffset = 0;
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

    function _yFormatter(y, line) {
        if (typeof y === 'boolean') return '' + y;
        var unit = that.config.l[line].unit ? ' ' + that.config.l[line].unit : '';
        if (that.config.l[line].afterComma !== undefined && that.config.l[line].afterComma !== null) {
            y = parseFloat(y);
            if (that.config.useComma) {
                return y.toFixed(that.config.l[line].afterComma).toString().replace('.', ',') + unit;
            } else {
                return y.toFixed(that.config.l[line].afterComma) + unit;
            }
        } else {
            if (that.config.useComma) {
                y = parseFloat(y);
                return y.toString().replace('.', ',') + unit;
            } else {
                return y + unit;
            }
        }
    }

    function _tickXFormatter(number, object) {
        if (ticks) return ' ';
        var now = new Date(parseInt(number, 10));
        if (that.config.timeFormatDate && that.config.timeFormatTime) {
            if (!object.ticks.length) {
                return '<b><i>' + $.plot.formatDate(now, that.config.timeFormatDate) + '</i></b>';
            }
            var d = new Date(object.ticks[object.ticks.length - 1].v);
            if (d.getDate() !== now.getDate()) {
                return '<b><i>' + $.plot.formatDate(now, that.config.timeFormatDate) + '</i></b>';
            }
            return $.plot.formatDate(now, that.config.timeFormatTime);
        } else {
            return $.plot.formatDate(now, that.config.timeFormat);
        }
    }

    function _tickYFormatter(number, object) {
        // If tickDecimals was specified, ensure that we have exactly that
        // much precision; otherwise default to the value's own precision.
        var afterComma = that.config.l[object.n - 1].afterComma;

        if (afterComma !== null && afterComma !== undefined) {
            var factor = afterComma ? Math.pow(10, afterComma) : 1;
            var formatted = (Math.round(number * factor) / factor).toString();
            var decimal = formatted.indexOf('.');
            var precision = decimal === -1 ? 0 : formatted.length - decimal - 1;

            if (precision < afterComma) {
                number = (precision ? formatted : formatted + '.') + factor.toString().substr(1, afterComma - precision);
            } else {
                number = formatted;
            }
        }

        if (that.config.useComma) number = number.toString().replace('.', ',');

        var unit = that.config.l[object.n - 1].unit;

        return number + (unit ? (' ' + unit) : '');
    }

    function showLabels (animation) {
        if (that.config.barLabels) {
            setTimeout(function () {
                var data = that.chart.getData();

                for (var d = 0; d < data.length; d++) {
                    if (that.config.l[d].chartType !== 'bar') continue;

                    $.each(data[d].data, function (i, el) {
                        if (el[1] === null) return;
                        if (!i) return;
                        if (i === data[d].data.length - 1) return;
                        var o;
                        if (that.config.barLabels === 'topover') {
                            o = that.chart.pointOffset({x: el[0], y: el[1]});
                            o.top -= 20;
                        } else if (that.config.barLabels === 'topunder') {
                            o = that.chart.pointOffset({x: el[0], y: el[1]});
                            //o.top += 10;
                        } else if (that.config.barLabels === 'bottom') {
                            o = that.chart.pointOffset({x: el[0], y: 0});
                            o.top += 20;
                        } else {//if (that.config.barLabels === 'middle') {
                            o = that.chart.pointOffset({x: el[0], y: el[1] / 2});
                        }

                        $('<div class="data-point-label"><div style="width: 100%; margin-left: -50%;">' + _yFormatter(el[1], d) + '</div></div>').css({
                            position: 'absolute',
                            left: o.left,
                            top: o.top
                        }).appendTo(that.chart.getPlaceholder());
                    });
                }
                if (that.config.barFontSize || that.config.barFontColor) {
                    $('.data-point-label').css({
                        'font-size': that.config.barFontSize || undefined,
                        color: that.config.barFontColor || undefined
                    });
                }

            }, animation ? parseInt(animation) + 200 : 0);
        }

        if (markLines && markLines.length) {
            setTimeout(function () {
                var data = that.chart.getData();
                var num = 0;
                for (var m = 0; m < markLines.length; m++) {
                    if (markLines[m].d && data[markLines[m].l + markingsOffset]) {
                        var line = data[num].data;
                        var o;
                        var text;
                        if (markLines[m].p === 'l') {
                            o = that.chart.pointOffset({x: line[0][0], y: line[0][1], yaxis: data[markLines[m].l + markingsOffset].yaxis, xaxis: data[markLines[m].l + markingsOffset].xaxis});
                            o.top -= markLines[m].py;
                            text = markLines[m].d;
                        } else {//if (markLines[m].p === 'r') {
                            o = that.chart.pointOffset({x: line[1][0], y: line[1][1], yaxis: data[markLines[m].l + markingsOffset].yaxis, xaxis: data[markLines[m].l + markingsOffset].xaxis});
                            o.top -= markLines[m].py;
                            text = '<div style="width: 100%; margin-left: -100%; padding-right: 15px; white-space: nowrap">' + markLines[m].d + '</div>';
                        }
                        $('<div class="marklines-label"  style="padding-left: 10px;  white-space: nowrap">' + text + '</div>').css({
                            position:   'absolute',
                            left:       o.left,
                            top:        o.top,
                            'font-size': markLines[m].fs || undefined,
                            color:      markLines[m].fc || undefined
                        }).appendTo(that.chart.getPlaceholder());
                    }
                    if (markLines[m].vl !== '' && markLines[m].vl !== null && markLines[m].vl !== undefined) {
                        num++;
                    }
                    num++;
                }
            }, animation ? parseInt(animation) + 200 : 0);
        }
    }

    (function _constructor () {
        series = [];
        var smoothing = false;
        var $title = $('#' + that.options.titleId);

        if (that.config.title && !$title.html()) {
            $title.html(that.config.titlePos ? decodeURI(that.config.title) : '');
            if (that.config.titleColor) $title.css('color',    that.config.titleColor);
            if (that.config.titleSize) $title.css('font-size', that.config.titleSize);
            if (that.config.titlePos) {
                var parts = that.config.titlePos.split(';');
                var css = {};
                for (var t = 0; t < parts.length; t++) {
                    var p = parts[t].split(':');

                    // Bottom inside
                    if (p[0] === 'bottom' && p[1] == '5') {
                        if (that.config.height.indexOf('%') === -1) {
                            css.top = parseInt(that.config.height, 10) - $title.height() - 45;
                        } else {
                            css.top = 'calc(' + that.config.height + ' - ' + ($title.height() + 45) + 'px)';
                        }
                    } else	// Bottom outside
                    if (p[0] === 'bottom' && p[1] == '-5') {
                        if (that.config.height.indexOf('%') === -1) {
                            css.top = parseInt(that.config.height, 10) + 5;
                        } else {
                            css.top = 'calc(' + that.config.height + ' + 5px)';
                        }
                    } else	// Middle
                    if (p[0] === 'top' && p[1] == '50') {
                        if (that.config.height.indexOf('%') === -1) {
                            css.top = (parseInt(that.config.height, 10) - $title.height()) / 2;
                        } else {
                            css.top = 'calc(50% - ' + ($title.height() / 2) + 'px)';
                        }
                    } else	// Center
                    if (p[0] === 'left' && p[1] == '50') {
                        if (that.config.width.indexOf('%') === -1) {
                            css.left = (parseInt(that.config.width, 10) - $title.width()) / 2;
                        } else {
                            css.left = 'calc(50% - ' + ($title.width() / 2) + 'px)';
                        }
                    } else	// Right inside
                    if (p[0] === 'right' && p[1] == '5') {
                        if (that.config.width.indexOf('%') === -1) {
                            css.left = parseInt(that.config.width, 10) - $title.width() - 45;
                        } else {
                            css.left = 'calc(' + that.config.width + ' - ' + ($title.width() + 45) + 'px)';
                        }
                    } else	// Right outside
                    if (p[0] === 'right' && p[1] == '-5') {
                        if (that.config.width.indexOf('%') === -1) {
                            css.left = parseInt(that.config.width, 10) + 25;
                        } else {
                            css.left = 'calc(' + that.config.width + ' + 5px)';
                        }
                    } else {
                        css[p[0]] = p[1];
                    }
                }

                $title.css(css);
            }
        }

        // Replace background
        if (that.config.bg && that.config.bg.length < 3 && backgrounds[that.config.bg]) that.config.bg = {colors: backgrounds[that.config.bg]};

        markingsOffset = 0;
        // draw horizontal lines
        if (markLines && markLines.length) {
            for (var m = 0; m < markLines.length; m++) {
                markingsOffset++;
                markLines[m].v  = parseFloat(markLines[m].v)  || 0; // value
                markLines[m].l  = parseInt(markLines[m].l)    || 0; // line number
                markLines[m].s  = parseFloat(markLines[m].s)  || 0; // shadow size
                markLines[m].t  = parseFloat(markLines[m].t)  || 0; // line width
                markLines[m].py = parseFloat(markLines[m].py) || 0; // y offset of label
                series.push({
                    id:         'line' + m,
                    xaxis:      {show: false},
                    color:      markLines[m].c || undefined,
                    lines:      {
                        show:       true,
                        fill:       markLines[m].f === '1'  || markLines[m].f === 1 || markLines[m].f === 'true' || markLines[m].f === true,
                        steps:      true,
                        lineWidth:  markLines[m].t
                    },
                    data:       [[0, markLines[m].v], [100, markLines[m].v]],
                    label:      '__hide_me__',
                    shadowSize: markLines[m].s
                });
                // if lower value set
                if (markLines[m].vl !== '' && markLines[m].vl !== null && markLines[m].vl !== undefined) {
                    markingsOffset++;
                    markLines[m].vl = parseFloat(markLines[m].vl) || 0;
                    series.push({
                        xaxis:      {show: false},
                        color:      markLines[m].c || undefined,
                        lines:      {
                            show:       true,
                            fill:       true,
                            steps:      true,
                            lineWidth:  markLines[m].t
                        },
                        data:       [[0, markLines[m].vl], [100, markLines[m].vl]],
                        fillBetween: 'line' + m,
                        label:      '__hide_me__',
                        shadowSize: markLines[m].s
                    });
                }
            }
        }

        //todo make bar working
//        if (that.config.renderer !== 'bar' || that.config._ids.length <= 1) {
        var xMin = Infinity;
        var xMax = 0;
        for (var i = 0; i < seriesData.length; i++) {
            if (seriesData[i]) {

                that.config.l[i].chartType = that.config.l[i].chartType || that.config.chartType || 'line';

                var option = {
                    color:      that.config.l[i].color || undefined,
                    lines:      {
                        show:       (that.config.l[i].chartType !== 'scatterplot' && that.config.l[i].chartType !== 'bar' && that.config.l[i].chartType !== 'spline'),
                        fill:       (that.config.l[i].fill && that.config.l[i].fill !== '0') ? parseFloat(that.config.l[i].fill) : (that.config.l[i].chartType === 'area' || that.config.l[i].chartType === 'bar'),
                        steps:      (that.config.l[i].chartType === 'steps'),
                        lineWidth:  that.config.l[i].thickness
                    },
                    splines:    {
                        show:       (that.config.l[i].chartType === 'spline'),
                        tension:    0.5, //(float between 0 and 1, defaults to 0.5),
                        lineWidth:  that.config.l[i].thickness,
                        fill:       (that.config.l[i].fill && that.config.l[i].fill !== '0') ? parseFloat(that.config.l[i].fill) : false //(float between 0 .. 1 or false, as in flot documentation)
                    },
                    bars:       {
                        show:       (that.config.l[i].chartType === 'bar'),
                        order:      i + 1,
                        barWidth:   0.6,
                        lineWidth:  that.config.l[i].thickness,
                        fill:       (that.config.l[i].fill && that.config.l[i].fill !== '0') ? parseFloat(that.config.l[i].fill) : false,
                        fillColor:  that.config.barColor || undefined,
                        align:      'center'
                    },
                    points:     {
                        show:       (that.config.l[i].chartType === 'lineplot' || that.config.l[i].chartType === 'scatterplot' || that.config.l[i].points === 'true' || that.config.l[i].points === true)
                    },
                    data:       seriesData[i],
                    label:      that.config.l[i].name,
                    shadowSize: that.config.l[i].shadowsize
                };

                if ((that.config.smoothing && that.config.smoothing > 0) || (that.config.l[i].smoothing && that.config.l[i].smoothing > 0)) {
                    smoothing = true;
                    that.config.l[i].smoothing = parseInt(that.config.l[i].smoothing || that.config.smoothing);
                    option.data = avg(option.data, that.config.l[i].smoothing);
                } else {
                    that.config.l[i].smoothing = 0;
                }

                that.config.l[i].afterComma = (that.config.l[i].afterComma === undefined || that.config.l[i].afterComma === '') ? that.config.afterComma : parseInt(that.config.l[i].afterComma, 10);

                if (that.config.l[i].chartType === 'bar') {
                    option.bars.barWidth = (option.data[option.data.length - 1][0] - option.data[0][0]) / option.data.length * (parseFloat(that.config.barWidth) || 0.5);
                }
                /*
                 if (that.config.l[i].chartType === 'pie') {
                 series.legend = {
                 show:   !!that.config.legend,
                 position: that.config.legend
                 };
                 } else if (that.config.l[i].chartType === 'bar') {
                 var series = {
                 series: {
                 bars: {
                 show: that.config.l[i].chartType === 'bar',
                 barWidth: 0.6,
                 align: "center"
                 },
                 pie: {
                 show: that.config.l[i].chartType === 'pie'
                 },
                 legend: {
                 show: !!that.config.legend,
                 position: that.config.legend
                 }
                 }
                 };
                 */

                series.push(option);

                if (seriesData[i][0][0] < xMin) xMin = seriesData[i][0][0];
                if (seriesData[i][seriesData[i].length - 1][0] > xMax) xMax = seriesData[i][seriesData[i].length - 1][0];
            }
        }


        if (that.config.min === null || that.config.min === undefined || that.config.min === '' || that.config.min.toString() === 'NaN') {
            that.config.min = undefined;
        } else {
            that.config.min = parseFloat(that.config.min);
        }

        if (that.config.noBorder) {
            if (!that.config.width)  that.config.width  = '100%';
            if (!that.config.height) that.config.height = '100%';

            if (that.config.width.indexOf('%') !== -1) {
                $('#chart_container').css({width: 'calc(' + that.config.width + ' - 20px)'}); // original 20px
            } else {
                $('#chart_container').css({width: that.config.width});
            }
            if (that.config.height.indexOf('%') !== -1) {
                $('#chart_container').css({height: 'calc(' + that.config.height + ' - 20px)'});// original 20px
            } else {
                $('#chart_container').css({height: that.config.height});
            }

        } else {
            $('#chart_container').addClass('chart-container').css({width: that.config.width, height: that.config.height});
//            $('#chart_container').css({'padding-bottom':"100px"})
        }

        if (that.config.timeFormat === 'null') that.config.timeFormat = undefined;

        if (that.config.timeFormat) {
            if (that.config.timeFormat.indexOf('%H:%M:%S') !== -1) {
                that.config.timeFormatTime = '%H:%M:%S';
            } else if (that.config.timeFormat.indexOf('%I:%M:%S') !== -1) {
                that.config.timeFormatTime = '%I:%M:%S';
            } else if (that.config.timeFormat.indexOf('%H:%M') !== -1) {
                that.config.timeFormatTime = '%H:%M';
            } else {
                that.config.timeFormatTime = null;
            }
            if (that.config.timeFormat.indexOf('%d.%m.%y') !== -1) {
                that.config.timeFormatDate = '%d.%m.%y';
            } else if (that.config.timeFormat.indexOf('%x %p') !== -1) {
                that.config.timeFormatDate = '%x %p';
            } else if (that.config.timeFormat.indexOf('%d/%m/%y') !== -1) {
                that.config.timeFormatDate = '%d/%m/%y';
            } else if (that.config.timeFormat.indexOf('%m.%d.%y') !== -1) {
                that.config.timeFormatDate = '%m.%d.%y';
            } else if (that.config.timeFormat.indexOf('%d.%m') !== -1) {
                that.config.timeFormatDate = '%d.%m';
            } else {
                that.config.timeFormatDate = null;
            }
        }

        settings = {
            grid: {
                hoverable:       (that.config.hoverDetail === 'true' || that.config.hoverDetail === true),
                backgroundColor: that.config.bg || undefined,
                borderWidth:     (!that.config.border_width && that.config.border_width !== '0' && that.config.border_width !== 0) ? undefined : parseInt(that.config.border_width, 10),
                borderColor:     that.config.border_color || undefined
            },
            yaxes: [],
            xaxes: [],
            legend: {
                show:       !!that.config.legend,
                position:   that.config.legend,
                hideable:   true,
                noColumns:  parseInt(that.config.legColumns, 10) || undefined,
                backgroundColor:  that.config.legBg || undefined,
                backgroundOpacity:  that.config.legBgOpacity !== undefined ? parseFloat(that.config.legBgOpacity) : 0.85,
                labelFormatter: function (label, series) {
                    if (label === '__hide_me__') return null;
                    return '<span class="graphlabel">' + label + '</span>';
                }
            }
        };

        if (that.config.zoom) {
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

        var steps = that.config.animation < 1000 ? 20 : 50;

        var ii;
        for (ii = 0; ii < that.config.l.length; ii++) {

            that.config.l[ii].yaxe = that.config.l[ii].yaxe || '';
            that.config.l[ii].xaxe = that.config.l[ii].xaxe || '';
            that.config.l[ii].commonYAxis = that.config.l[ii].commonYAxis || '';

            var yaxi = {
                show:       that.config.l[ii].yaxe !== 'off',
                min:        (that.config.l[ii].min !== '' && that.config.l[ii].min !== null && that.config.l[ii].min !== undefined) ? parseFloat(that.config.l[ii].min) : undefined,
                max:        (that.config.l[ii].max !== '' && that.config.l[ii].max !== null && that.config.l[ii].max !== undefined) ? parseFloat(that.config.l[ii].max) : undefined,
                position:   that.config.l[ii].yaxe.indexOf('left') > -1 ? 'left' : 'right',
                font: {
                    color:  that.config.l[ii].yaxe.indexOf('Color') > -1 ? that.config.l[ii].color : (that.config.y_labels_color || 'black')
                },
                zoomRange:  false,  // or [ number, number ] (min range, max range) or false
                panRange:   false,  // or [ number, number ] (min, max) or false
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
                ticks:      parseInt(that.config.l[ii].yticks, 10) || undefined,
                tickColor:  that.config.grid_color || undefined,
                tickFormatter: _tickYFormatter
            };

            var xaxi = {
                show:           that.config.l[ii].xaxe !== 'off',
                position:       that.config.l[ii].xaxe.indexOf('top') !== -1 ? 'top' : 'bottom',
                font: {
                    color:      that.config.l[ii].xaxe.indexOf('Color') !== -1 ? that.config.l[ii].color : (that.config.x_labels_color || 'black')
                },
                zoomRange:      null,  // or [ number, number ] (min range, max range) or false
                panRange:       null,  // or [ number, number ] (min, max) or false
                mode:           'time',
                //timeformat:   that.config.timeFormat,
                //timezone:     "browser",
                tickFormatter:  that.config.timeFormat ? _tickXFormatter : null,
                minTickSize:    (that.config.l[ii].chartType === 'bar') ? series[ii + markingsOffset].bars.barWidth : undefined,
                tickColor:      that.config.grid_color || undefined,
                ticks:          parseInt(that.config.l[ii].xticks, 10) || undefined,
                min:            undefined,
                max:            undefined
            };

            // prepare for bar
            if (that.config.l[ii].chartType === 'bar') {
                settings.legend.hideable = false;

                xaxi.ticks = [];
                for (var m = 0; m < seriesData[ii].length; m++) {
                    xaxi.ticks.push(seriesData[ii][m][0]);
                    // Normally first and last points are invalid
                }
                seriesData[ii][0][1] = null;
                seriesData[ii][seriesData[ii].length - 1][1] = null;
            } else if (ticks) {
                xaxi.ticks = ticks;
            }

            if (that.config.zoom) {
                var now = new Date();
                xaxi.zoomRange = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
                xaxi.panRange  = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
            }

            settings.yaxes.push(yaxi);
            settings.xaxes.push(xaxi);

            // Support for commonYAxis
            if (that.config.l[ii].commonYAxis !== '') {
                series[ii + markingsOffset].yaxis = parseInt(that.config.l[ii].commonYAxis);
            } else {
                series[ii + markingsOffset].yaxis = ii + 1;
            }
            series[ii + markingsOffset].xaxis = ii + 1;

            series[ii + markingsOffset].curvedLines = {
                apply:          !!that.config.l[ii].smoothing,
                active:         !!that.config.l[ii].smoothing,
                monotonicFit:   true
            };
        }

        // set yaxis
        if (markLines && markLines.length) {
            var num = 0;
            for (var mm = 0; mm < markLines.length; mm++) {
                if (series[markLines[mm].l + markingsOffset]) {
                    markLines[mm].l = parseInt(markLines[mm].l, 10);
                    series[num].yaxis = series[markLines[mm].l + markingsOffset].yaxis;
                    series[num].data[0][0] = xMin;
                    series[num].data[1][0] = xMax;
                    num++;
                    // if lower value set
                    if (markLines[mm].vl !== '' && markLines[mm].vl !== null && markLines[mm].vl !== undefined) {
                        series[num].yaxis = series[markLines[mm].l + markingsOffset].yaxis;
                        series[num].data[0][0] = xMin;
                        series[num].data[1][0] = xMax;
                        num++;
                    }
                }
            }
        }

        if (smoothing) {
            settings.series = settings.series || {};
            settings.series.curvedLines = {
                apply:          true,
                active:         true,
                monotonicFit:   true
            };
        }
        if (that.config.animation) {
            settings.series = settings.series || {};
            settings.series.grow = {
                active:         true,
                steps:          steps,
                stepDelay:      that.config.animation / steps
            };
        }

        // hiddengraphs overload the labelFormatter, so we should overload the hiddengraphs
        $.plot.plugins.push({
            init: function (plot) {
                plot.hooks.processOptions.push(function checkOptions(plot, options) {
                    if (!options.legend.hideable) {
                        return;
                    }

                    options.legend.labelFormatter = function(label, series) {
                        if (label === '__hide_me__') return null;
                        return '<span class="graphlabel">' + label + '</span>';
                    };
                });
            },
            options: options,
            name: 'hiddenGraphsEx',
            version: '1.0'
        });

        that.chart = $.plot('#' + that.options.chartId, series, settings);

        showLabels(that.config.animation);

        var $div = $('#' + that.options.chartId);

        that.options.tooltipId = that.options.tooltipId || 'tooltip';

        // Hoover
        if (that.config.hoverDetail === 'true' || that.config.hoverDetail === true) {
            $div.unbind('plothover').bind('plothover', function (event, pos, item) {
                if (item) {
                    var x = item.datapoint[0].toFixed(2);
                    var y;

                    if (that.config.l[item.seriesIndex - markingsOffset].type === 'boolean') {
                        y = !!Math.round(item.datapoint[1] - that.config.l[item.seriesIndex - markingsOffset].yOffset);
                    } else {
                        y = (item.datapoint[1] - that.config.l[item.seriesIndex - markingsOffset].yOffset).toFixed(2);
                    }

                    var text = item.series.label ? item.series.label + '<br>' : '';
                    text += $.plot.formatDate(new Date(parseInt(x, 10)), that.config.timeFormat) + '<br>';
                    text += '<b>' + _yFormatter(y, item.seriesIndex - markingsOffset) + '</b>';

                    var $tooltip = $('#' + that.options.tooltipId).html(text);
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

            if (!$('#' + that.options.tooltipId).length) {
                $('<div id="' + that.options.tooltipId + '"></div>').css({
                    position:   'absolute',
                    display:    'none',
                    border:     '1px solid #fdd',
                    padding:    '2px',
                    'background-color': '#fee',
                    opacity:    0.80
                }).appendTo('body');
            }
        }

        if (that.config.zoom && that.options.cbOnZoom) {
            $div.unbind('plotzoom').bind('plotzoom', function (e, plot, args) {
                if (that.zoomTimeout) clearTimeout(that.zoomTimeout);
                that.zoomTimeout = setTimeout(that.options.cbOnZoom, 500);
            }).unbind('plotpan').bind('plotpan', function (e, plot, args) {
                if (that.zoomTimeout) clearTimeout(that.zoomTimeout);
                that.zoomTimeout = setTimeout(that.options.cbOnZoom, 500);
            })
        }
    })();

    this.update = function (newSeriesData, newMarkingsData, newTicks) {
        if (newSeriesData) {
            var xMin = Infinity;
            var xMax = 0;

            for (var index = 0; index < config.l.length; index++) {
                series[index + markingsOffset].data = newSeriesData[index];
                if (newSeriesData[index][0][0] < xMin) xMin = newSeriesData[index][0][0];
                if (newSeriesData[index][newSeriesData[index].length - 1][0] > xMax) xMax = newSeriesData[index][newSeriesData[index].length - 1][0];

                // prepare for bar
                if (config.l[index].chartType === 'bar') {
                    settings.xaxes[index].ticks = [];
                    for (var m = 0; m < newSeriesData[index].length; m++) {
                        settings.xaxes[index].ticks.push(newSeriesData[index][m][0]);
                    }
                    // Normally first and last points are invalid
                    newSeriesData[index][0][1] = null;
                    newSeriesData[index][newSeriesData[index].length - 1][1] = null;
                }
            }

            // update xmin and xmax
            if (markLines && markLines.length) {
                var num_ = 0;
                for (var m = 0; m < markLines.length; m++) {
                    series[num_].data[0][0] = xMin;
                    series[num_].data[1][0] = xMax;
                    num_++;
                    // if lower value set
                    if (markLines[m].vl !== '' && markLines[m].vl !== null && markLines[m].vl !== undefined) {
                        series[num_].data[0][0] = xMin;
                        series[num_].data[1][0] = xMax;
                        num_++;
                    }
                }
            }

            $('.data-point-label').remove();
            $('.marklines-label').remove();

            if (settings.series && settings.series.grow) settings.series.grow.active = false;
        }
        if (newMarkingsData) {
            if (newMarkingsData && newMarkingsData.length) {
                var num = 0;
                for (var mm = 0; mm < newMarkingsData.length; mm++) {
                    series[num].data[0][1] = newMarkingsData[mm].v;
                    series[num].data[1][1] = newMarkingsData[mm].v;
                    num++;
                    // if lower value set
                    if (newMarkingsData[mm].vl !== '' && newMarkingsData[mm].vl !== null && newMarkingsData[mm].vl !== undefined) {
                        series[num].data[0][1] = newMarkingsData[mm].vl;
                        series[num].data[1][1] = newMarkingsData[mm].vl;
                        num++;
                    }
                }
            }
        }
        this.chart = $.plot('#' + this.options.chartId, series, settings);
        showLabels(false);
    };

    this.getRange = function () {
        var opt = this.chart.getOptions();
        var result = [];
        for (var index = 0; index < opt.xaxes.length; index++) {
            result[index] = {
                min: Math.round(opt.xaxes[index].min),
                max: Math.round(opt.xaxes[index].max)
            };
            settings.xaxes[index].max = result[index].max;
            settings.xaxes[index].min = result[index].min;
        }
        return result;
    };

    this.setRange = function (minMaxArr) {
        for (var index = 0; index < settings.xaxes.length; index++) {
            settings.xaxes[index].min = minMaxArr[index].min;
            settings.xaxes[index].max = minMaxArr[index].max;
        }
    };

    this.resetZoom = function (time) {
        time = time || new Date();
        for (var index = 0; index < settings.xaxes.length; index++) {
            settings.xaxes[index].zoomRange = [null, time.getTime()];
            settings.xaxes[index].panRange  = [null, time.getTime()];
        }
    };

    this.zoom = function (positionX, amount) {
        var offset     = this.chart.offset();
        this.chart.zoom({
            center: {
                left:   positionX - offset.left,
                height: this.chart.height() / 2
            },
            amount: amount
        });
    };

    this.pan = function (positionX) {
        this.chart.pan({left: positionX, top: 0});
    };

    return this;
}



