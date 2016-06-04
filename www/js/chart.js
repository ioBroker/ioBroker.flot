//options: {
//   chartId: 
//   titleId:
//   tooltipId:
//   cbOnZoom:
// }

function CustomChart(options, config, seriesData) {
    "use strict";
    
    if (!(this instanceof CustomChart)) return new CustomChart(options, config, seriesData);
    
    this.chart   = null;
    this.config  = config;
    this.options = options;
    
    var that     = this;
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
        var now = new Date(parseInt(number, 10));
        if (that.config.timeFormatDate && that.config.timeFormatTime) {
            if (!object.ticks.length) {
                return $.plot.formatDate(now, that.config.timeFormatDate);
            }
            var d = new Date(object.ticks[object.ticks.length - 1].v);
            if (d.getDate() != now.getDate()) {
                return $.plot.formatDate(now, that.config.timeFormatDate);
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
            var precision = decimal == -1 ? 0 : formatted.length - decimal - 1;

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

    (function _constructor () {
        series = [];
        var smoothing = false;
        var $title = $('#' + that.options.titleId);

        if (that.config.title && !$title.html()) {
            $title.html(decodeURI(that.config.title));
            if (that.config.titleColor) $title.css('color',    that.config.titleColor);
            if (that.config.titleSize) $title.css('font-size', that.config.titleSize);
            if (that.config.titlePos) {
                var parts = that.config.titlePos.split(';');
                var css = {};
                for (var t = 0; t < parts.length; t++) {
                    var p = parts[t].split(':');

                    // Bottom inside
                    if (p[0] == 'bottom' && p[1] == '5') {
                        if (that.config.height.indexOf('%') == -1) {
                            css.top = parseInt(that.config.height, 10) - $title.height() - 45;
                        } else {
                            css.top = 'calc(' + that.config.height + ' - ' + ($title.height() + 45) + 'px)';
                        }
                    } else	// Bottom outside
                    if (p[0] == 'bottom' && p[1] == '-5') {
                        if (that.config.height.indexOf('%') == -1) {
                            css.top = parseInt(that.config.height, 10) + 5;
                        } else {
                            css.top = 'calc(' + that.config.height + ' + 5px)';
                        }
                    } else	// Middle
                    if (p[0] == 'top' && p[1] == '50') {
                        if (that.config.height.indexOf('%') == -1) {
                            css.top = (parseInt(that.config.height, 10) - $title.height()) / 2;
                        } else {
                            css.top = 'calc(50% - ' + ($title.height() / 2) + 'px)';
                        }
                    } else	// Center
                    if (p[0] == 'left' && p[1] == '50') {
                        if (that.config.width.indexOf('%') == -1) {
                            css.left = (parseInt(that.config.width, 10) - $title.width()) / 2;
                        } else {
                            css.left = 'calc(50% - ' + ($title.width() / 2) + 'px)';
                        }
                    } else	// Right inside
                    if (p[0] == 'right' && p[1] == '5') {
                        if (that.config.width.indexOf('%') == -1) {
                            css.left = parseInt(that.config.width, 10) - $title.width() - 45;
                        } else {
                            css.left = 'calc(' + that.config.width + ' - ' + ($title.width() + 45) + 'px)';
                        }
                    } else	// Right outside
                    if (p[0] == 'right' && p[1] == '-5') {
                        if (that.config.width.indexOf('%') == -1) {
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

        //todo make bar working
//        if (that.config.renderer != 'bar' || that.config._ids.length <= 1) {

        for (var i = 0; i < seriesData.length; i++) {
            if (seriesData[i]) {

                that.config.l[i].chartType = that.config.l[i].chartType || that.config.chartType || 'line';

                var option = {
                    color:      that.config.l[i].color || undefined,
                    lines: {
                        show:       (that.config.l[i].chartType !== 'scatterplot' && that.config.l[i].chartType !== 'bar' && that.config.l[i].chartType !== 'spline'),
                        fill:       (that.config.l[i].chartType === 'area' || that.config.l[i].chartType == 'bar'),
                        steps:      (that.config.l[i].chartType === 'steps'),
                        lineWidth:  that.config.l[i].thickness
                    },
                    splines: {
                        show:       (that.config.l[i].chartType === 'spline'),
                        tension:    0.5, //(float between 0 and 1, defaults to 0.5),
                        lineWidth:  that.config.l[i].thickness,
                        fill:       false //(float between 0 .. 1 or false, as in flot documentation)
                    },
                    bars: {
                        show:       (that.config.l[i].chartType === 'bar'),
                        barWidth:   0.6,
                        align:      'center'
                    },
                    points: {
                        show:       (that.config.l[i].chartType == 'lineplot' || that.config.l[i].chartType == 'scatterplot')
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
                    option.bars.barWidth = (option.data[option.data.length - 1][0] - option.data[0][0]) / option.data.length * 0.5;
                }
                /*
                 if (that.config.l[i].chartType == 'pie') {
                 series.legend = {
                 show:   !!that.config.legend,
                 position: that.config.legend
                 };
                 } else if (that.config.l[i].chartType === 'bar') {
                 var series = {
                 series: {
                 bars: {
                 show: that.config.l[i].chartType == 'bar',
                 barWidth: 0.6,
                 align: "center"
                 },
                 pie: {
                 show: that.config.l[i].chartType == 'pie'
                 },
                 legend: {
                 show: !!that.config.legend,
                 position: that.config.legend
                 }
                 }
                 };
                 */

                series.push(option);
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

            if (that.config.width.indexOf('%') != -1) {
                $('#chart_container').css({width: 'calc(' + that.config.width + ' - 20px)'}); // original 20px
            } else {
                $('#chart_container').css({width: that.config.width});
            }
            if (that.config.height.indexOf('%') != -1) {
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
            if (that.config.timeFormat.indexOf('%H:%M:%S') != -1) {
                that.config.timeFormatTime = '%H:%M:%S';
            } else if (that.config.timeFormat.indexOf('%I:%M:%S') != -1) {
                that.config.timeFormatTime = '%I:%M:%S';
            } else if (that.config.timeFormat.indexOf('%H:%M') != -1) {
                that.config.timeFormatTime = '%H:%M';
            } else {
                that.config.timeFormatTime = null;
            }
            if (that.config.timeFormat.indexOf('%d.%m.%y') != -1) {
                that.config.timeFormatDate = '%d.%m.%y';
            } else if (that.config.timeFormat.indexOf('%x %p') != -1) {
                that.config.timeFormatDate = '%x %p';
            } else if (that.config.timeFormat.indexOf('%d/%m/%y') != -1) {
                that.config.timeFormatDate = '%d/%m/%y';
            } else if (that.config.timeFormat.indexOf('%m.%d.%y') != -1) {
                that.config.timeFormatDate = '%m.%d.%y';
            } else if (that.config.timeFormat.indexOf('%d.%m') != -1) {
                that.config.timeFormatDate = '%d.%m';
            } else {
                that.config.timeFormatDate = null;
            }
        }

        settings = {
            grid: {
                hoverable:       (that.config.hoverDetail === 'true' || that.config.hoverDetail === true),
                backgroundColor: that.config.bg || undefined
            },
            yaxes: [],
            xaxes: [],
            legend: {
                show:       !!that.config.legend,
                position:   that.config.legend,
                hideable:   true
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

        for (var ii = 0; ii < that.config.l.length; ii++) {

            that.config.l[ii].yaxe = that.config.l[ii].yaxe || '';
            that.config.l[ii].xaxe = that.config.l[ii].xaxe || '';
            that.config.l[ii].commonYAxis = that.config.l[ii].commonYAxis || '';

            var yaxi = {
                show: that.config.l[ii].yaxe !== 'off',
                min:  (that.config.l[ii].min !== '' && that.config.l[ii].min !== null && that.config.l[ii].min !== undefined) ? parseFloat(that.config.l[ii].min) : undefined,
                max:  (that.config.l[ii].max !== '' && that.config.l[ii].max !== null && that.config.l[ii].max !== undefined) ? parseFloat(that.config.l[ii].max) : undefined,
                position: that.config.l[ii].yaxe.indexOf('left') > -1 ? 'left' : 'right',
                font: {
                    color: that.config.l[ii].yaxe.indexOf('Color') > -1 ? that.config.l[ii].color : (that.config.y_labels_color || 'black')
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

                tickFormatter: _tickYFormatter
            };

            var xaxi = {
                show:       that.config.l[ii].xaxe !== 'off',
                position:   that.config.l[ii].xaxe.indexOf('top') !== -1 ? 'top' : 'bottom',
                font: {
                    color: that.config.l[ii].xaxe.indexOf('Color') !== -1 ? that.config.l[ii].color : (that.config.x_labels_color || 'black')
                },
                zoomRange: null,  // or [ number, number ] (min range, max range) or false
                panRange:  null,  // or [ number, number ] (min, max) or false
                mode:      'time',
                //timeformat: that.config.timeFormat,
                //timezone:   "browser",
                tickFormatter: that.config.timeFormat ? _tickXFormatter : null,
                minTickSize: (that.config.l[ii].chartType === 'bar') ? series[ii].bars.barWidth : undefined,
                min: undefined,
                max: undefined
            };

            // why ??
            if (that.config.l[ii].chartType === 'bar') {
                settings.legend.hideable = false;
            }

            if (that.config.zoom) {
                xaxi.zoomRange = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
                xaxi.panRange  = [null, now.getTime()]; // or [ number, number] (min range, max range) or false
            }

            settings.yaxes.push(yaxi);
            settings.xaxes.push(xaxi);

            // Support for commonYAxis
            if (that.config.l[ii].commonYAxis !== '') {
                series[ii].yaxis = parseInt(that.config.l[ii].commonYAxis);
            } else {
                series[ii].yaxis = ii + 1;
            }
            series[ii].xaxis = ii + 1;

            series[ii].curvedLines = {
                apply:          !!that.config.l[ii].smoothing,
                active:         !!that.config.l[ii].smoothing,
                monotonicFit:   true
            };
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

        that.chart = $.plot('#' + that.options.chartId, series, settings);

        var $div = $('#' + that.options.chartId);

        that.options.tooltipId = that.options.tooltipId || 'tooltip';

        // Hoover
        if (that.config.hoverDetail === 'true' || that.config.hoverDetail === true) {
            $div.unbind('plothover').bind('plothover', function (event, pos, item) {
                if (item) {
                    var x = item.datapoint[0].toFixed(2);
                    var y;

                    if (that.config.l[item.seriesIndex].type === 'boolean') {
                        y = !!Math.round(item.datapoint[1] - that.config.l[item.seriesIndex].yOffset);
                    } else {
                        y = (item.datapoint[1] - that.config.l[item.seriesIndex].yOffset).toFixed(2);
                    }

                    var text = item.series.label ? item.series.label + '<br>' : '';
                    text += $.plot.formatDate(new Date(parseInt(x, 10)), that.config.timeFormat) + '<br>';
                    text += '<b>' + _yFormatter(y, item.seriesIndex) + '</b>';

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

    this.update = function (newSeriesData) {
        for (var index = 0; index < config.l.length; index++) {
            series[index].data = newSeriesData[index];
        }
        if (settings.series && settings.series.grow) settings.series.grow.active = false;
        this.chart = $.plot('#' + this.options.chartId, series, settings);
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



