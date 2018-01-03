$(document).ready(function () {
    'use strict';

    var defaultColors   = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080'];
    var instances       = [];
    var timer           = null;
    var showTimer       = null;
    var defaultHistory  = '';
    var presets         = {};
    var currentChart    = null;
    var onlyOneChart    = false;
    var loaded          = false;
    var socket;
    var instance        = 0;
    var setup           = {
        options: {
            l: []
        }
    };

    function parseSettings(path) {
        if (path) {
            setup.options = deparam(path || '');
            // for compatibility. Not used any more
            if (setup.options._ids) {
                var ids = setup.options._ids ? setup.options._ids.split(';') : [];
                var colors = setup.options._colors ? setup.options._colors.split(';') : [];
                var names = setup.options._names ? setup.options._names.split(';') : [];
                var units = setup.options._units ? setup.options._units.split(';') : [];
                setup.options.l = [];
                for (var i = 0; i < ids.length; i++) {
                    setup.options.l.push({
                        id: ids[i],
                        offset: 0,
                        name: names[i] || '',
                        aggregate: 'minmax',
                        color: colors[i] || 'blue',
                        thickness: setup.options.strokeWidth || 1,
                        shadowsize: setup.options.strokeWidth || 1,
                        smoothing: setup.options.smoothing || 0,
                        afterComma: setup.options.afterComma || 0,
                        min: setup.options.min || '',
                        max: setup.options.max || '',
                        unit: units[i] || ''
                    });
                }
                setup.options.aggregateType = 'step';
                setup.options.aggregateSpan = 300;
                setup.options.relativeEnd = 'now';
                if (setup.options._colors) delete setup.options._colors;
                if (setup.options._names) delete setup.options._names;
                if (setup.options._ids) delete setup.options._ids;
            }
            setup.options.l = setup.options.l || [];
        }

        // convert art to aggregate
        for (var j = 0; j < setup.options.l.length; j++) {
            if (setup.options.l[j].art) {
                setup.options.l[j].aggregate = setup.options.l[j].art;
                delete setup.options.l[j].art;
            }
        }
        // rename timeArt
        if (setup.options.timeArt) {
            setup.options.timeType = setup.options.timeArt;
            delete setup.options.timeArt;
        }
        var $presetsTable = $('#presets_table');

        $presetsTable.find('tr').removeClass('presets-selected');
        $presetsTable.find('tr[data-name="' + currentChart + '"]').addClass('presets-selected');

        if (setup.options.lines) {
            setup.options.l = JSON.parse(JSON.stringify(setup.options.lines));
            delete setup.options.lines;
        }
        setup.options.ignoreNull = undefined;
        setup.options.afterComma = undefined;
        setup.options.smoothing = undefined;

        if (!setup.options.l || !setup.options.l.length) addLine();
    }

    function addLine() {
        if (!setup.options.l) setup.options.l = [];
        var index = setup.options.l.length;

        setup.options.l.push({
            id: '',
            instance: '',
            offset: 0,
            aggregate: 'minmax',
            color: defaultColors[index] || '#00FFFF',
            min: '',
            max: '',
            thickness: 3,
            shadowsize: 3,
            unit: '',
            name: ''
        });

        return index;
    }

    function addMarkline() {
        if (!setup.options.m) setup.options.m = [];
        var index = setup.options.m.length;
        setup.options.m.push({
            l: 0, // line index
            v: 0, // value
            f: false,
            c: defaultColors[index] || '#00FFFF', // color
            t: 3, // thickness
            s: 3, // shadowsize
            d: '', // description
            p: 'l', // position : left / right
            py: 0, // description y offset
            fc: defaultColors[index] || '#00FFFF', // color of text
            fs: '' // font-size
        });

        return index;
    }

    function showMarklines(callback) {
        setTimeout(function () {
            if (!settings.option_markline) {
                $('.markline-option').hide();
                return;
            }

            var text = '';
            // line index
            var textLines = '';
            for (var t = 0; t < setup.options.l.length; t++) {
                textLines += '<option value="' + t + '">' + t + ' - ' + setup.options.l[t].id + '</option>\n';
            }

            var textPosition = '<option value="l">' + _('Left') + '</option>';
            textPosition += '<option value="r">' + _('Right') + '</option>';

            if (setup.options.m) {
                for (var i = 0; i < setup.options.m.length; i++) {
                    text += '<tr>';
                    // line index
                    text += '<td><select class="markline-value" data-index="' + i + '" data-option="l" style="width: 95%">' + textLines + '</select></td>';

                    // upper value
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="v" style="width: 200px;display: inline"/></td>';
                    text += '<td><button style="display: inline; margin-right: 15px;" class="markline-select-dialog" data-index="' + i + '" data-option="v">...</button></td>';
                    // lower value
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="vl" style="width: 200px;display: inline"/></td>';
                    text += '<td><button style="display: inline; margin-right: 15px;" class="markline-select-dialog" data-index="' + i + '" data-option="vl">...</button></td>';
                    // color
                    text += '<td><input class="markline-value markline-color" data-index="' + i + '" data-option="c"/ style="width: 100px"></td>';
                    // fill
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="f" type="checkbox"/></td>';
                    // thickness
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="t" type="number" min="1" style="width: 60px"/></td>';
                    // shadowsize
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="s" type="number" min="0" style="width: 60px"/></td>';
                    // description
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="d" style="width: 95%"/></td>';
                    // description position
                    text += '<td><select class="markline-value" data-index="' + i + '" data-option="p">' + textPosition + '</select></td>';
                    // description-offset
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="py" type="number" style="width: 60px"/></td>';
                    // font-size
                    text += '<td><input class="markline-value" data-index="' + i + '" data-option="fs" type="number" min="0" style="width: 60px"/></td>';
                    // font-color
                    text += '<td><input class="markline-value markline-color" data-index="' + i + '" data-option="fc" style="width: 100px"/></td>';
                    // delete
                    text += '<td><button class="markline-remove" data-index="' + i + '"></button></td>\n';

                    text += '</tr>';
                }
            }
            $('#markline_list').html(text);

            $('.markline-value').each(function () {
                var id = $(this).data('index');
                var name = $(this).data('option');
                if ($(this).attr('type') === 'checkbox') {
                    if (setup.options.m[id][name] === 'true') setup.options.m[id][name] = true;
                    if (setup.options.m[id][name] === 'false') setup.options.m[id][name] = false;
                    $(this).prop('checked', !!setup.options.m[id][name]);
                } else {
                    $(this).val(setup.options.m[id][name]);
                }
            });

            /*$('.markline-color').colorPicker({
                renderCallback: function ($elm, toggled) {
                    if (toggled === false) {
                        $elm.trigger('change');
                    }
                }
            });*/
            $('.markline-color').colorpicker({
                colorFormat: '#HEX'
            }).on('change', function () {
                $(this).css({'background-color': $(this).val(), color: invertColor($(this).val())});
            }).trigger('change');

            $('.markline-remove').button({
                icons: {primary: 'ui-icon-trash'},
                text: false
            }).click(function () {
                if (setup.options.m.length) {
                    var i = $(this).data('index');
                    setup.options.m.splice(i, 1);
                    showMarklines();
                    save();
                    delayedUpdate();
                }
            }).css({width: 22, height: 22});

            $('.markline-select-dialog').button({
                text: false,
                icons: {
                    primary: 'ui-icon-folder-open'
                }
            }).css({width: 25, height: 22}).click(function () {
                var index = $(this).data('index');
                var attr = $(this).data('option');
                $('#dialog-select-member').selectId('show', setup.options.m[index][attr], {
                        common: {
                            custom: false
                        }
                    },
                    function (newId, ignore, obj) {
                        setup.options.l[index][attr] = newId;
                        $('.markline-value[data-index="' + index + '"][data-option="' + attr + '"]').val(newId).trigger('change');
                    });
            });
        }, 100);
    }

    function showOptionsDialog(index) {
        var options = setup.options.l[index];
        var $dialogLineOptions = $('#dialog-line-options');
        $dialogLineOptions.data('index', index);

        if (!$dialogLineOptions.data('inited')) {
            $dialogLineOptions.data('inited', true);

            var count = 0;
            var text = '';
            for (var attr in settings.extraOptions) {
                if (!settings.extraOptions.hasOwnProperty(attr)) continue;
                count++;
                text += '<tr ' + (settings.extraOptions[attr].title ? 'title="' + settings.extraOptions[attr].title + '" ' : '') + '>';
                text += '<td><label for="option_' + attr + '">' + _(settings.extraOptions[attr].name || attr) + '</label></td>';
                if (attr === 'offset') {
                    text += '<td><select id="option_' + attr + '" ' +
                        'style="' + (settings.extraOptions[attr].width ? 'width: ' + settings.extraOptions[attr].width + ';' : '') + (settings.extraOptions[attr].style || '') + '" ' +
                        'class="dialog-line-option ' + (settings.extraOptions[attr]._class || '') + '" ' +
                        'data-option="' + attr + '">\n';
                    text +=
                        '<option value="0">' + _('0s') + '</option>' +
                        '<option value="10">' + _('10s') + '</option>' +
                        '<option value="30">' + _('30s') + '</option>' +
                        '<option value="60">' + _('60s') + '</option>' +
                        '<option value="120">' + _('2m') + '</option>' +
                        '<option value="180">' + _('3m') + '</option>' +
                        '<option value="240">' + _('4m') + '</option>' +
                        '<option value="300">' + _('5m') + '</option>' +
                        '<option value="600">' + _('10m') + '</option>' +
                        '<option value="900">' + _('15m') + '</option>' +
                        '<option value="1800">' + _('30m') + '</option>' +
                        '<option value="2700">' + _('45m') + '</option>' +
                        '<option value="3600">' + _('1H') + '</option>' +
                        '<option value="7200">' + _('2H') + '</option>' +
                        '<option value="21600">' + _('6H') + '</option>' +
                        '<option value="43200">' + _('12H') + '</option>' +
                        '<option value="86400">' + _('1D') + '</option>' +
                        '<option value="172800">' + _('2D') + '</option>' +
                        '<option value="259200">' + _('3D') + '</option>' +
                        '<option value="345600">' + _('4D') + '</option>' +
                        '<option value="604800">' + _('1W') + '</option>' +
                        '<option value="1209600">' + _('2W') + '</option>' +
                        '<option value="1m">' + _('1M') + '</option>' +
                        '<option value="2m">' + _('2M') + '</option>' +
                        '<option value="3m">' + _('3M') + '</option>' +
                        '<option value="6m">' + _('6M') + '</option>' +
                        '<option value="1y">' + _('1Y') + '</option>' +
                        '<option value="2y">' + _('2Y') + '</option>';
                    text += '</select></td>\n';
                } else if (!settings.extraOptions[attr].values) {
                    text += '<td><input id="option_' + attr + '" class="dialog-line-option" data-option="' + attr + '" ' +
                        (settings.extraOptions[attr].type ? 'type="' + settings.extraOptions[attr].type + '" ' : '') +
                        ' style="' + (settings.extraOptions[attr].width ? 'width: ' + settings.extraOptions[attr].width + ';' : '') + (settings.extraOptions[attr].style || '') + '" ' +
                        (settings.extraOptions[attr].default !== undefined ? 'data-default="' + settings.extraOptions[attr].default + '"' : '') +
                        '/></td>';
                } else {
                    text += '<td><select id="option_' + attr + '" class="dialog-line-option" data-option="' + attr + '" ' +
                        (settings.extraOptions[attr].type ? 'type="' + settings.extraOptions[attr].type + '" ' : '') +
                        ' style="' + (settings.extraOptions[attr].width ? 'width: ' + settings.extraOptions[attr].width + ';' : '') + (settings.extraOptions[attr].style || '') + '" ' +
                        (settings.extraOptions[attr].default !== undefined ? 'data-default="' + settings.extraOptions[attr].default + '"' : '') +
                        '>';
                    for (var opt = 0; opt < settings.extraOptions[attr].values.length; opt++) {
                        text += '<option value="' + settings.extraOptions[attr].values[opt] + '">' +
                            (settings.extraOptions[attr].names && settings.extraOptions[attr].names[opt] !== undefined ?
                                _(settings.extraOptions[attr].names[opt]) : settings.extraOptions[attr].values[opt]) +
                            '</option>';
                    }

                    text += '</select></td>';
                }
                text += '</tr>';
            }
            $dialogLineOptions.find('table').html(text);

            $dialogLineOptions.dialog({
                autoOpen: false,
                modal: true,
                width: 430,
                resizable: false,
                height: count * 32 + 120,
                buttons: [
                    {
                        text: _('Ok'),
                        click: function () {
                            var $dialogLineOptions = $('#dialog-line-options');
                            var index = $dialogLineOptions.data('index');
                            var changed = false;
                            var options = setup.options.l[index];
                            $dialogLineOptions.find('.dialog-line-option').each(function () {
                                var attr = $(this).data('option');

                                if ($(this).attr('type') === 'checkbox') {
                                    if ($(this).prop('checked') !== options[attr]) {
                                        changed = true;
                                        options[attr] = $(this).prop('checked');
                                    }
                                } else {
                                    if ($(this).val() != options[attr]) {
                                        changed = true;
                                        options[attr] = $(this).val();
                                    }
                                }
                            });

                            if (changed) update();

                            $dialogLineOptions.dialog('close');
                        }
                    },
                    {
                        text: _('Cancel'),
                        click: function () {
                            $('#dialog-line-options').dialog('close');
                        }
                    }
                ]
            });

        }


        $dialogLineOptions.find('.dialog-line-option').each(function () {
            var attr = $(this).data('option');
            if ($(this).attr('type') === 'checkbox') {
                if (options[attr] === 'true') options[attr] = true;
                if (options[attr] === 'false') options[attr] = false;
                if ($(this).data('default') !== null && $(this).data('default') !== undefined &&
                    (options[attr] === undefined || options[attr] === '' || options[attr] === null)) {
                    options[attr] = $(this).data('default') === 'true';
                }
                $(this).prop('checked', options[attr] === true);
            } else {
                if ($(this).data('default') !== null && $(this).data('default') !== undefined &&
                    (options[attr] === undefined || options[attr] === '' || options[attr] === null)) {
                    options[attr] = $(this).data('default');
                }
                $(this).val(options[attr] === undefined ? '' : options[attr]);
            }
        });

        $dialogLineOptions.dialog('option', 'title', _('Edit options for line %s', index + 1));
        $dialogLineOptions.dialog('open');
    }

    function showIds(callback) {
        setTimeout(function () {
            var text = '';
            var colgroup = '<colgroup>\n';
            var thead = '<tr style="text-align: center" class="header">\n';

            var textInstances = '<option value="">' + _('default') + '</option>\n';
            for (var t = 0; t < instances.length; t++) {
                textInstances += '<option value="' + instances[t] + '">' + instances[t] + '</option>\n';
            }

            var colindex = 0;
            for (var s in settings.line) {
                if (settings.line.hasOwnProperty(s) && settings.line[s].enabled) {
                    colgroup += '<col data-index="' + colindex + '" ' + (settings.line[s].width ? 'width="' + settings.line[s].width + '"' : '') + ' />\n';
                    thead += '<th class="toggleable" data-index="' + colindex + '" title="' + _(settings.line[s].title) + '" ' + (settings.line[s].width ? 'width="' + settings.line[s].width + '"' : '') + '>' + _(settings.line[s].name) + '</th>\n';
                    colindex++;
                }
            }
            colgroup += '</colgroup>';
            thead += '</tr>';

            for (var i = 0; i < setup.options.l.length && i < settings.maxLines; i++) {
                var line = setup.options.l[i];

                text += '<tr data-index="' + i + '" class="inputData">\n';
                for (var s in settings.line) {
                    if (!settings.line.hasOwnProperty(s) || !settings.line[s] || !settings.line[s].enabled) continue;
                    settings.line[s].style = settings.line[s].style || '';
                    settings.line[s]._class = settings.line[s]._class || '';

                    if (s === 'min') {
                        line.min = (line.min === undefined) ? '' : line.min;
                    } else if (s === 'max') {
                        line.max = (line.max === undefined) ? '' : line.max;
                    }

                    if (s === 'number') {
                        text += '<td title="' + _('Line') + ' ' + (i + 1) + '">' + (i + 1) + '</td>\n';
                    } else if (s === 'idSelect') {
                        text += '<td><button style="display: inline" class="select-dialog" data-index="' + i + '" data-ids="' + i + '">...</button></td>\n';
                    } else if (s === 'instance') {
                        text += '<td style="' + settings.line[s].style + '"><select data-option="' + s + '" data-index="' + i + '" class="input options-lines' + settings.line[s]._class + '" style="display: inline;" value="' + (line[s] || '') + '">' + textInstances + '</select></td>\n';
                    } else if (s === 'offset') {
                        text += '<td style="' + settings.line[s].style + '">\n';
                        text += '<select class="input options-lines ' + settings.line[s]._class + '" data-index="' + i + '" data-option="' + s + '">\n';
                        text +=
                            '<option value="0">' + _('0s') + '</option> ' +
                            '<option value="10">' + _('10s') + '</option>' +
                            '<option value="30">' + _('30s') + '</option>' +
                            '<option value="60">' + _('60s') + '</option>' +
                            '<option value="120">' + _('2m') + '</option>' +
                            '<option value="180">' + _('3m') + '</option>' +
                            '<option value="240">' + _('4m') + '</option>' +
                            '<option value="300">' + _('5m') + '</option>' +
                            '<option value="600">' + _('10m') + '</option>' +
                            '<option value="900">' + _('15m') + '</option>' +
                            '<option value="1800">' + _('30m') + '</option>' +
                            '<option value="2700">' + _('45m') + '</option>' +
                            '<option value="3600">' + _('1H') + '</option>' +
                            '<option value="7200">' + _('2H') + '</option>' +
                            '<option value="21600">' + _('6H') + '</option>' +
                            '<option value="43200">' + _('12H') + '</option>' +
                            '<option value="86400">' + _('1D') + '</option>' +
                            '<option value="172800">' + _('2D') + '</option>' +
                            '<option value="259200">' + _('3D') + '</option>' +
                            '<option value="345600">' + _('4D') + '</option>' +
                            '<option value="604800">' + _('1W') + '</option>' +
                            '<option value="1209600">' + _('2W') + '</option>' +
                            '<option value="1m">' + _('1M') + '</option>' +
                            '<option value="2m">' + _('2M') + '</option>' +
                            '<option value="3m">' + _('3M') + '</option>' +
                            '<option value="6m">' + _('6M') + '</option>' +
                            '<option value="1y">' + _('1Y') + '</option>' +
                            '<option value="2y">' + _('2Y') + '</option>';
                        text += '</select></td>\n';
                    } else if (s === 'removeButton') {
                        text += '<td style="' + settings.line[s].style + '"><button class="id-remove" data-index="' + i + '"></button></td>\n';
                    } else if (s === 'extraOptions') {
                        text += '<td style="' + settings.line[s].style + '"><button class="id-options" data-index="' + i + '"></button></td>\n';
                    } else {
                        text += '<td style="' + settings.line[s].style + '">\n';
                        if (settings.line[s].values) {
                            text += '<select data-option="' + s + '" class="input options-lines ' + settings.line[s]._class + '" data-index="' + i + '" value="' + (line[s] || settings.line[s].default || '') + '">\n';
                            for (var a = 0; a < settings.line[s].values.length; a++) {
                                text += '<option value="' + settings.line[s].values[a] + '">' + _(settings.line[s].values[a]) + '</option>\n';
                            }
                            text += '</select>\n';
                        } else {
                            text += '<input data-option="' + s + '" type="' + (settings.line[s].type || 'text') + '" style="width: 100%; ' + (settings.line[s].inputStyle || '') + '" data-index="' + i + '" class="options-lines ' + settings.line[s]._class + '" value="' + (line[s] || settings.line[s].default || '') + '">\n';
                        }
                        text += '</td>\n';
                    }
                }

                text += '</tr>';
            }

            $('#idslist').html(thead + text);

            /*$('.input-color').colorPicker({
                renderCallback: function ($elm, toggled) {
                    if (toggled === false) {
                        $elm.trigger('change');
                    }
                }
            });*/
            if (systemLang === 'de') {
                $.colorpicker.regional = {
                    '': {
                        ok: 'OK',
                        cancel: 'Abbrechen',
                        none: 'Nichts',
                        button: 'Farbe',
                        title: 'Farbe wählen',
                        transparent: 'Transparent',
                        hsvH: 'H',
                        hsvS: 'S',
                        hsvV: 'V',
                        rgbR: 'R',
                        rgbG: 'G',
                        rgbB: 'B',
                        labL: 'L',
                        labA: 'a',
                        labB: 'b',
                        hslH: 'H',
                        hslS: 'S',
                        hslL: 'L',
                        cmykC: 'C',
                        cmykM: 'M',
                        cmykY: 'Y',
                        cmykK: 'K',
                        alphaA: 'A'
                    }
                };
            } else if (systemLang === 'ru') {
                $.colorpicker.regional = {
                    '': {
                        ok: 'OK',
                        cancel: 'Отмена',
                        none: 'Нет',
                        button: 'Цвет',
                        title: 'Выбрать цвет',
                        transparent: 'Прозрачность',
                        hsvH: 'H',
                        hsvS: 'S',
                        hsvV: 'V',
                        rgbR: 'R',
                        rgbG: 'G',
                        rgbB: 'B',
                        labL: 'L',
                        labA: 'a',
                        labB: 'b',
                        hslH: 'H',
                        hslS: 'S',
                        hslL: 'L',
                        cmykC: 'C',
                        cmykM: 'M',
                        cmykY: 'Y',
                        cmykK: 'K',
                        alphaA: 'A'
                    }
                };
            }

            $('.input-color').colorpicker({
                colorFormat: '#HEX'
            }).on('change', function () {
                $(this).css({'background-color': $(this).val(), color: invertColor($(this).val())});
            }).trigger('change');

            $('.id-remove').button({
                icons: {primary: 'ui-icon-trash'},
                text: false
            }).click(function () {
                if (setup.options.l.length) {
                    var i = $(this).data('index');
                    setup.options.l.splice(i, 1);
                    if (!setup.options.l.length) {
                        addLine();
                    }
                    showIds();
                    save();
                    delayedUpdate();
                }
            }).css({width: 22, height: 22});

            $('.id-options').button({
                icons: {primary: 'ui-icon-gear'},
                text: false
            }).click(function () {
                showOptionsDialog($(this).data('index'));
            }).css({width: 22, height: 22});

            $('.select-dialog').button({
                text: false,
                icons: {
                    primary: 'ui-icon-folder-open'
                }
            }).css({width: 25, height: 22}).click(function () {
                var index = $(this).data('index');
                // get instance
                var instance = $('[data-option="instance"][data-index="' + index + '"]').val();
                if (!instance) instance = defaultHistory;

                $('#dialog-select-member').selectId('show', setup.options.l[index].id, {
                        common: {
                            custom: instance
                        }
                    },
                    function (newId, ignore, obj) {
                        setup.options.l[index].id = newId;
                        $('.ids[data-index="' + index + '"]').val(newId).trigger('change');
                        if (obj && obj.common.type === 'boolean') {
                            $('select[data-option="aggregate"][data-index="' + index + '"]').val('onchange').trigger('change');
                            $('select[data-option="chartType"][data-index="' + index + '"]').val('steps').trigger('change');
                            $('input[data-option="min"][data-index="' + index + '"]').val(0).trigger('change');
                            $('input[data-option="max"][data-index="' + index + '"]').val(10).trigger('change');
                        }
                        showIds();
                    });
            });

            $('.options-lines').each(function () {
                var $this = $(this);
                var index = $(this).data('index');
                var opt = $(this).data('option');

                if (setup.options.l[index][opt] !== undefined) {
                    if ($this.attr('type') === 'checkbox') {
                        if (setup.options.l[index][opt] === 'true') setup.options.l[index][opt] = true;
                        if (setup.options.l[index][opt] === 'false') setup.options.l[index][opt] = false;

                        $this.prop('checked', !!setup.options.l[index][opt]);
                    } else {
                        $this.val(setup.options.l[index][opt]);
                    }
                }
            });
            $('.spinner-lines').attr('type', 'number');
            /*$('.spinner-lines').spinner().on('stop', function () {
                $(this).trigger('change');
            }).parent().addClass('input');*/

            if (typeof callback === 'function') callback();

            $('.toggleable').click(function () {
                var index = $(this).data('index');
                var $col = $('col[data-index="' + index + '"]');
                if (!$col.data('width')) $col.data('width', $col.attr('width'));
                if ($col.data('hidden')) {
                    $col.data('hidden', false);
                    $col.attr('width', $col.data('width'));
                    $(this).css('width', $col.data('width'));
                } else {
                    $col.data('hidden', true);
                    $col.attr('width', '10px');
                    $(this).css('width', '10px');
                }
            });
            $('select[data-option="chartType"]').on('change', function () {
                if ($(this).val() === 'spline') {
                    alert('Experimental');
                }
            });

            showMarklines();
        }, 100);
    }

    function getSettings() {
        var _options = JSON.parse(JSON.stringify(setup.options));

        // clean options
        for (var y in _options) {
            if (_options.hasOwnProperty(y) && _options[y] === '') {
                delete _options[y];
            }
        }

        // clean lines
        for (var i = 0; i < _options.l.length; i++) {
            if (_options.l[i].id === '') {
                _options.l.splice(i, 1);
                i--;
            } else {
                for (var x in _options.l[i]) {
                    if (_options.l[i].hasOwnProperty(x) && _options.l[i][x] === '') {
                        delete _options.l[i][x];
                    }
                }
            }
        }

        //console.log(deparam($.param(_options)));

        return $.param(_options);
    }

    function delayedUpdate() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(update, 500);
    }

    function update() {
        if (!loaded) return;
        clearTimeout(timer);
        timer = null;

        // Store settings
        if (typeof(Storage) !== 'undefined') {
            $('.value').each(function () {
                if ($(this).attr('type') === 'checkbox') {
                    setup.options[$(this).attr('id')] = $(this).prop('checked');
                } else {
                    setup.options[$(this).attr('id')] = $(this).val();
                }
            });

            save();
        }

        var settings = getSettings();
        if (currentChart) {
            if (settings !== presets[currentChart].native.url) {
                $('.save').button('enable');
            } else {
                $('.save').button('disable');
            }
        } else {
            $('.save').button('enable');
        }


        $('#link').val(location.href.split('?')[0].replace('edit.html', 'index.html') + '?' + settings);
        $('#updatePreview').button('option', 'disabled', false);

        if ($('#aggregateType').val() === 'step') {
            $('#spanName').text(_('Seconds') + ':');
        } else {
            $('#spanName').text(_('Counts') + ':');
        }

        $('.relative, .static').hide();

        $('.' + $('#timeType').val()).show();

        if ($('#autoUpdate').prop('checked')) {
            delayedPreview();
            $('#updatePreview').hide();
        }

        // calculate span
        var text = '';
        if (setup.options.timeType === 'relative') {
            text = _('%s ago', $('#range').find('option:selected').text()) + ' - ' + _(setup.options.relativeEnd);
        } else {
            text = new Date(setup.options.start).toLocaleDateString() + ' ' +
                new Date(setup.options.start + ' ' + setup.options.start_time).toLocaleTimeString() + ' - ' +
                new Date(setup.options.end).toLocaleDateString() + ' ' +
                new Date(setup.options.end + ' ' + setup.options.end_time).toLocaleTimeString();
        }
        $('#time_span').html('[' + text + ']');
    }

    function save() {
        if (typeof(Storage) !== 'undefined') {
            localStorage.setItem('iobroker.Flot', JSON.stringify(setup));
        }
    }

    function delayedPreview() {
        if (showTimer) clearTimeout(showTimer);
        showTimer = setTimeout(updatePreview, 500);
    }

    function updatePreview() {
        var $chart = $('#chart');
        var height = parseInt($('#height').val(), 10);
        if (height) {
            $chart.css({height: (height || 500) + 90});
        } else {
            $chart.css({height: 'calc(100% - 350px)'});
        }

        var settings = getSettings();
        $chart.attr('src', '');
        setTimeout(function () {
            $chart.attr('src', 'index.html?' + settings + '&' + (new Date()).getTime());
        }, 0);

        $('#updatePreview').button('option', 'disabled', true);
    }

    function invertColor(hexcolor) {
        hexcolor = hexcolor.replace('#', '');
        var r = parseInt(hexcolor.substr(0, 2), 16);
        var g = parseInt(hexcolor.substr(2, 2), 16);
        var b = parseInt(hexcolor.substr(4, 2), 16);
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    function saveChart(id, name, callback) {
        if (!id || !presets[id]) {
            id = name2Chart(name);

            presets[id] = {
                common: {
                    name: name
                },
                type: 'chart',
                native: {
                    url: getSettings()
                }
            };
        } else {
            presets[id].native.url = getSettings();
        }

        currentChart = id;

        socket.emit('setObject', id, presets[id], function (err) {
            $('.save').button('disable');
            callback && callback(err)
        });
    }

    function loadChart(id, callback) {
        socket.emit('getObject', id, function (err, obj) {
            if (!obj) {
                alert(_('Not found'));
                callback && callback();
            } else {
                currentChart = obj._id;
                presets[obj._id] = obj;
                parseSettings(obj.native.url);
                $('#accordion').tabs({active: 1});
                showIds();
                fillValues();

                update();

                delayedPreview();
                callback && callback();
            }
        });
    }

    function name2Chart(name) {
        return 'flot.' + instance + '.' + name.replace(/[.,\s]+/, '_');
    }

    function renameChart(id, newName, callback) {
        socket.emit('getObject', id, function (err, obj) {
            socket.emit('delObject', obj._id, function (err) {
                delete presets[obj._id];
                obj.common.name = newName;
                obj._id = name2Chart(name);
                socket.emit('setObject', obj._id, obj, function (err) {
                    presets[obj._id] = obj;
                    currentChart = obj._id;
                    showPresets();
                    callback && callback();
                });
            });
        });
    }

    function getDesc(url) {
        var parts = deparam(url || '');
        if (parts.l) {
            var ids = [];
            for (var i = 0; i < parts.l.length; i++) {
                ids.push(parts.l[i].id);
            }
            return ids.join(', ');
        }

        return '';
    }

    function showPresets() {
        var texts = '';
        var settings = getSettings();
        for (var id in presets) {
            if (!presets.hasOwnProperty(id)) continue;
            var obj = presets[id];
            if (!currentChart && obj.native.url === settings) {
                currentChart = id;
            }
            texts += '<tr data-name="' + id + '" class="' + (id === currentChart ? 'presets-selected' : '') + '">';
            texts += '<td class="presets_table_th_load" style="text-align: center"><button class="presets-btn-load" data-name="' + id + '">' + _('load') + '</button></td>';
            texts += '<td class="presets_table_th_name">' + obj.common.name + '</td>';
            texts += '<td class="presets_table_th_ids">' + getDesc(obj.native.url) + '</td>';
            texts += '<td class="presets_table_th_buttons" style="text-align: center"></button><button data-name="' + id + '" class="presets-btn-delete"></button><button data-name="' + id + '" class="presets-btn-rename"></button></td>';
            texts += '</tr>';
        }
        var $presetsTable = $('#presets_table');
        $presetsTable.html(texts);

        $('.presets-btn-load').button().click(function () {
            var id = $(this).data('name');
            loadChart(id, function () {
                $presetsTable.find('tr').removeClass('presets-selected');
                $presetsTable.find('tr[data-name="' + id + '"]').addClass('presets-selected');
            });
        });

        $('.presets-btn-delete').button({
            icons: {secondary: 'ui-icon-trash'},
            text: false
        }).click(function () {
            var id = $(this).data('name');
            if (window.confirm(_('Are you sure?'))) {
                socket.emit('delObject', id, function (err) {
                    delete presets[id];
                    showPresets();
                });
            }
        }).css({width: 32, height: 32});
        $('.presets-btn-rename').button({
            icons: {secondary: 'ui-icon-pencil'},
            text: false
        }).click(function () {
            var id = $(this).data('name');
            $('#dialog-new-preset-name').val(presets[id].common.name);

            $('#dialog-new-preset-info-tr').hide();

            $('#dialog-new-preset').dialog({
                autoOpen: true,
                modal: true,
                title: _('Enter chart name'),
                width: 430,
                resizable: false,
                buttons: [
                    {
                        id: 'dialog-new-preset-ok',
                        text: _('Ok'),
                        click: function () {
                            var newName = $('#dialog-new-preset-name').val();
                            var newId = name2Chart(newName);
                            if (presets[newId] && !window.confirm(_('Overwrite existing?'))) {
                                return;
                            }

                            renameChart(id, newName, function () {
                                $('#dialog-new-preset').dialog('close');
                            });
                        }
                    },
                    {
                        text: _('Cancel'),
                        click: function () {
                            $('#dialog-new-preset').dialog('close');
                        }
                    }
                ]
            });
        }).css({width: 32, height: 32});
    }

    function fillValues() {
        $('.value')
            .each(function () {
                var $this = $(this);
                var id = $this.attr('id');
                if (setup.options[id] !== undefined) {
                    if ($this.attr('type') === 'checkbox') {
                        if (setup.options[id] === 'true') setup.options[id] = true;
                        if (setup.options[id] === 'false') setup.options[id] = false;
                        $this.prop('checked', !!setup.options[id]);
                    } else {
                        $this.val(setup.options[id]);
                    }
                }
            });
        if (setup.options.bg || setup.options.bg === 0) {
            if (setup.options.bg && setup.options.bg.length < 3 && parseInt(setup.options.bg, 10).toString() === setup.options.bg.toString()) {
                $('#bg').hide();
                $('#bg_predefined').show().val(setup.options.bg);
            } else {
                $('#bg_custom').prop('checked', true);
                $('#bg').show();
                $('#bg_predefined').hide();
            }
        }
    }

    function init() {
        // hide/show settings
        if (settings.maxLines < 2) {
            $('#ids_add').hide();
        }
        for (var s in settings) {
            if (!settings.hasOwnProperty(s)) continue;
            if (typeof settings[s] === 'object' && settings[s].enabled === false) {
                $('.' + s).remove();
            }
        }

        addLine();
        var params = location.href.split('?')[1];
        if (params && params.match(/^preset=/)) {
            currentChart = params.replace(/^preset=/, '');
            onlyOneChart = true;
        } else {
            parseSettings(location.href.split('?')[1]);
        }

        if (typeof sysLang !== 'undefined') {
            systemLang = sysLang || 'en';
        }

        $('#dialog-select-member').selectId('init', {
            filter: {
                common: {
                    custom: true
                }
            },
            noMultiselect: true,
            connCfg: {
                socketUrl: socketUrl,
                socketSession: socketSession,
                socketName: 'flotEdit',
                upgrade: typeof socketForceWebSockets !== 'undefined' ? !socketForceWebSockets : undefined,
                rememberUpgrade: typeof socketForceWebSockets !== 'undefined' ? socketForceWebSockets : undefined,
                transports: typeof socketForceWebSockets !== 'undefined' ? (socketForceWebSockets ? ['websocket'] : undefined) : undefined
            },
            columns: ['name', 'role', 'room', 'value'],
            texts: {
                select: _('Select'),
                cancel: _('Cancel'),
                all: _('All'),
                id: _('ID'),
                name: _('Name'),
                role: _('Role'),
                room: _('Room'),
                value: _('Value'),
                selectid: _('Select ID'),
                from: _('From'),
                lc: _('Last changed'),
                ts: _('Time stamp'),
                wait: _('Processing...'),
                ack: _('Acknowledged')
            }
        });

        if (typeof(Storage) !== 'undefined' && !currentChart) {
            var _setup = localStorage.getItem('iobroker.Flot');
            if (_setup) {
                try {
                    _setup = JSON.parse(_setup);
                    var parts = document.location.href.split('?');
                    if (parts[1]) {
                        _setup.options = setup.options;
                        setup = _setup;
                        save();
                        document.location.href = parts[0];
                    } else if (_setup.options) {
                        setup = _setup;
                    }
                }
                catch (e) {
                    console.log('Cannot parse stored settings');
                }
            }
        }

        $('#autoUpdate').change(function () {
            setup['auto-update'] = $(this).prop('checked') ? 'true' : 'false';
            update();
            if (setup['auto-update'] === 'true') {
                $('#updatePreview').hide();
            } else {
                $('#updatePreview').show();
            }
        }).prop('checked', setup['auto-update'] === 'true');

        $('#arrangeBools').button().click(function () {
            // arrange all boolean values automatically
            //  calculate
            var count = 0;
            var axis = null;
            for (var k = 0; k < setup.options.l.length; k++) {
                if (setup.options.l[k].chartType === 'steps') {
                    if (axis === null) axis = k;
                    count++;
                }
            }

            var t = 0;
            for (var i = 0; i < setup.options.l.length; i++) {
                if (setup.options.l[i].chartType === 'steps') {
                    setup.options.l[i].max = Math.round(count * 2 * 1.2 * 10) / 10;
                    setup.options.l[i].commonYAxis = axis + 1;
                    setup.options.l[i].yOffset = Math.round(-(t + 1) * 1.2 * 10) / 10;
                    setup.options.l[i].min = Math.round((-count * 1.2 - 0.1) * 10) / 10;
                    setup.options.l[i].yaxe = 'off';
                    t++;
                }
                setup.options.l[i].min = Math.round((-count * 1.2 - 0.1) * 10) / 10;
            }
            showIds();
            save();
            delayedUpdate();
        });

        var $accordion = $('#accordion');

        $accordion
            .on('change', '.options-lines', function () {
                var index = $(this).data('index');
                if ($(this).attr('type') === 'checkbox') {
                    setup.options.l[index][$(this).data('option')] = $(this).prop('checked');
                } else {
                    setup.options.l[index][$(this).data('option')] = $(this).val();
                }
                if ($(this).hasClass('spinner-lines')) {
                    delayedUpdate();
                } else {
                    update();
                }
            })
            .on('keyup', '.options-lines', function () {
                $(this).trigger('change');
            });

        $accordion
            .on('change', '.markline-value', function () {
                var index = $(this).data('index');
                if ($(this).attr('type') === 'checkbox') {
                    setup.options.m[index][$(this).data('option')] = $(this).prop('checked') ? 1 : 0;
                } else {
                    setup.options.m[index][$(this).data('option')] = $(this).val();
                }
                update();
            })
            .on('keyup', '.markline-value', function () {
                $(this).trigger('change');
            });

        // hide presets
        if (onlyOneChart) {
            $($accordion.find('li')[0]).hide();
            $('#chapter_presets').hide();
        }

        $('#ids_add').button({
            icons: {secondary: 'ui-icon-plus'},
            text: true
        }).click(function () {
            addLine();
            showIds();
        }).css({height: 30});

        $('#markline_add').button({
            icons: {secondary: 'ui-icon-plus'},
            text: true
        }).click(function () {
            addMarkline();
            showMarklines();
        }).css({height: 30});

        $('#clear').button({
            icons: {primary: 'ui-icon-trash'},
            text: false
        }).click(function () {
            localStorage.setItem('iobroker.Flot', JSON.stringify({reset: true}));
            location.reload();
        }).css({width: 30, height: 30});

        $('.value')
            .change(function () {
                if ($(this).hasClass('spinner') || $(this).hasClass('input-static-color')) {
                    delayedUpdate();
                } else {
                    update();
                }
            })
            .keyup(function () {
                $(this).trigger('change');
            });

        /*$('.input-static-color').colorPicker({
            renderCallback: function ($elm, toggled) {
                if (toggled === false) {
                    $elm.trigger('change');
                }
            }
        });*/
        $('.input-static-color').colorpicker({
            colorFormat: '#HEX'
        }).on('change', function () {
            $(this).css({'background-color': $(this).val(), color: invertColor($(this).val())});
        }).trigger('change');

        $('.clear-button').hide();
        /*.button({
                        icons: {
                            primary: 'ui-icon-trash'
                        },
                        text: false
                    }).css({width: 22, height: 22}).click(function () {
                        var id = $(this).data('clear');
                        setTimeout(function () {
                            $('#' + id)
                                    .val('')
                                    .css({color: '#000', 'background-color': '#FFF'});
                                    //.trigger('change');
                        }, 500);
                    });*/

        $('#timeType').change(function () {
            $('.relative, .static').hide();
            $('.' + $(this).val()).show();
        });

        $('.spinner').attr('type', 'number');
        /*$('.spinner').spinner().on('stop', function () {
            $(this).trigger('change');
        }).parent().addClass('input');*/

        $('#bg_custom').change(function () {
            if ($(this).prop('checked')) {
                $('#bg').show();
                $('#bg_predefined').hide();
            } else {
                $('#bg').hide();
                $('#bg_predefined')
                    .show()
                    .val(0)
                    .trigger('change');
            }
        });

        $('#bg_predefined').change(function () {
            $('#bg').val($(this).val()).trigger('change');
        });

        $('#ticks_select').button({
            text: false,
            icons: {
                primary: 'ui-icon-folder-open'
            }
        }).css({width: 25, height: 22}).click(function () {
            $('#dialog-select-member').selectId('show', $('#ticks').val(), {
                    common: {
                        custom: true
                    }
                },
                function (newId, ignore, obj) {
                    if (newId) {
                        $('#ticks').val(newId).trigger('change');
                    }
                });
        });


        $('#aggregateType').change(function () {
            if ($('#aggregateType').val() === 'step') {
                $('#spanName').text(_('Seconds'));
            } else {
                $('#spanName').text(_('Counts'));
            }
        });

        //      $('#range').val(options.range);
        //      $('#axeX').val(options.axeX);
        $('#updatePreview')
            .button({
                icons: {
                    primary: 'ui-icon-refresh'
                }
            })
            .click(updatePreview)
            .button('option', 'disabled', true)
            .css({'font-size': 14, 'white-space': 'nowrap'});

        $('#open').button({
            icons: {
                primary: 'ui-icon-play'
            }
        }).click(function () {
            window.open($('#link').val(), 'flot');
        }).css({'font-size': 14, 'white-space': 'nowrap'});

        translateAll();

        $accordion.tabs({
            active: parseInt(setup.acc) || 0,
            animate: {
                easing: 'linear',
                duration: 200
            },
            activate: function (event, ui) {
                setup.acc = $(ui.newHeader).attr('id');
                save();
            }
        });

        // Handler for .ready() called.
        var bottomElemOriginalHeight = $('#chart').height();
        $('#resizable1').resizable({
            autoHide: true,
            handles: 's',
            resize: function (e, ui) {
                /*var parent = ui.element.parent();
                var remainingSpace = parent.height() - ui.element.outerHeight();
                var divTwo = ui.element.next();
                var divTwoWidth = (remainingSpace - (divTwo.outerHeight() - divTwo.height())) / parent.height() * 100 + '%';
                divTwo.width(divTwoWidth);*/
                $('#chart').height(bottomElemOriginalHeight - (ui.element.outerHeight() - ui.originalSize.height));
            },
            stop: function (e, ui) {
                bottomElemOriginalHeight = $('#chart').height();
                /* var parent = ui.element.parent();
                ui.element.css({height: ui.element.height() / parent.height() * 100 + '%'}); */
                $('#temp_div').remove();
            },
            start: function () {
                var $ifr = $('#chart');
                var $d = $('<div></div>');

                $('body').append($d[0]);
                $d[0].id = 'temp_div';
                $d.css({position: 'absolute'});
                $d.css({top: $ifr.position().top, left: 0});
                $d.height($ifr.height());
                $d.width('100%');
            }
        });

        window.onbeforeunload = function (e) {
            console.log('onbeforeunload');
            if (onlyOneChart && currentChart) {
                var settings = getSettings();
                if (settings !== presets[currentChart].native.url) {
                    e.returnValue = _('You have unsaved settings. Discard?');
                    return e.returnValue;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        };

        fillValues();

        initSocket();
    }

    function initSocket() {
        // Read instances
        socket = io.connect(socketUrl, {
            query: 'key=' + socketSession,
            'reconnection limit': 10000,
            'max reconnection attempts': Infinity,
            upgrade: typeof socketForceWebSockets !== 'undefined' ? !socketForceWebSockets : undefined,
            rememberUpgrade: typeof socketForceWebSockets !== 'undefined' ? socketForceWebSockets : undefined,
            transports: typeof socketForceWebSockets !== 'undefined' ? (socketForceWebSockets ? ['websocket'] : undefined) : undefined
        });

        socket.on('connect', function () {
            this.emit('name', 'flotEdit');

            this.emit('getObject', 'system.config', function (err, obj) {
                if (obj && obj.common) defaultHistory = obj.common.defaultHistory || 'history.0';
                // load history instances
                socket.emit('getObjectView', 'system', 'instance', {
                    startkey: 'system.adapter.',
                    endkey: 'system.adapter.\u9999'
                }, function (err, doc) {
                    if (!err && doc && doc.rows) {
                        if (doc.rows.length !== 0) {
                            for (var i = 0; i < doc.rows.length; i++) {
                                var obj = doc.rows[i].value;
                                if (obj && obj.type === 'instance' && obj.common && obj.common.type === 'storage') {
                                    if (instances.indexOf(obj._id.substring('system.adapter.'.length)) === -1) instances.push(obj._id.substring('system.adapter.'.length));
                                }
                            }
                        }
                    }
                    showIds();

                    update();

                    delayedPreview();
                    // not need to disconnect, because socket-io uses pool
                    //socket.disconnect();
                    //socket = null;
                });
            });

            this.emit('getObjectView', 'chart', 'chart', {
                startkey: 'flot.' + instance + '.',
                endkey: 'flot.' + instance + '.\u9999'
            }, function (err, res) {
                presets = {};
                loaded  = true;
                if (res && res.rows) {
                    for (var i = 0; i < res.rows.length; i++) {
                        presets[res.rows[i].value._id] = res.rows[i].value;
                    }
                }
                if (currentChart && !presets[currentChart]) {
                    alert(_('Chart ID %s not found', currentChart));
                    currentChart = '';
                    onlyOneChart = false;
                    $($('#accordion').find('li')[0]).show();
                    $('#chapter_presets').show();
                }

                if (currentChart) {
                    setTimeout(function () {
                        loadChart(currentChart);
                    }, 200);
                }
                showPresets();

                var $save = $('.save');
                $save
                    .button({
                        icons: {
                            primary: 'ui-icon-arrowthickstop-1-s'
                        },
                        label: onlyOneChart ? _('save %s', presets[currentChart].common.name) : _('save'),
                        showLabel: true
                    })
                    .click(function () {
                        if (onlyOneChart && currentChart) {
                            saveChart(currentChart);
                            return;
                        }

                        var texts = '<option value="">' + _('new') + '</option>';
                        for (var id in presets) {
                            texts += '<option value="' + id + '">' + presets[id].common.name + '</option>';
                        }

                        $('#dialog-new-preset-info-tr').show();

                        $('#dialog-new-preset-into')
                            .html(texts)
                            .val(currentChart)
                            .unbind('change')
                            .bind('change', function () {
                                var val = $(this).val();
                                if (!val) {
                                    $('#dialog-new-preset-name-tr').show();
                                } else {
                                    $('#dialog-new-preset-name-tr').hide();
                                }
                            }).trigger('change');

                        $('#dialog-new-preset').dialog({
                            autoOpen: true,
                            modal: true,
                            title: _('Enter chart name'),
                            width: 430,
                            resizable: false,
                            buttons: [
                                {
                                    id: 'dialog-new-preset-ok',
                                    text: _('Ok'),
                                    click: function () {
                                        var name = $('#dialog-new-preset-into').val();
                                        var id = name;

                                        if (!name) {
                                            name = $('#dialog-new-preset-name').val();
                                            id = name2Chart(name);
                                            if (presets[id]) {
                                                // Warning. Overwrite?
                                                if (!window.confirm(_('Overwrite existing?'))) {
                                                    return;
                                                }
                                            }
                                        }

                                        saveChart(id, name, function () {
                                            showPresets();
                                            $('#dialog-new-preset').dialog('close');
                                        });
                                    }
                                },
                                {
                                    text: _('Cancel'),
                                    click: function () {
                                        $('#dialog-new-preset').dialog('close');
                                    }
                                }
                            ]
                        });
                    })
                    .css({'font-size': 14, 'white-space': 'nowrap'});

                // select editor tab if no presets
                if (!res || !res.rows || !res.rows.length) {
                    $('#accordion').tabs({active: 1});
                    $save.button('enable');
                } else if (currentChart) {
                    $save.button('disable');
                }

                $('#dialog-new-preset-name').keyup(function (e) {
                    if (e.keyCode === 13) {
                        $('#dialog-new-preset-ok').trigger('click');
                    }
                });
            });
        });
    }

    init();
});
