var settings = {
    maxLines: 20, // maximal number of the lines
    line: {
        offset:         true, // support of time offset
        yOffset:        true, // support of Y offset
        aggregations:   ['minmax', 'average', 'min', 'max', 'total', 'onchange'],
        chartType:      ['line', 'area', /*'bar',*/ 'lineplot', 'scatterplot', 'steps', /*'pie',*/ 'spline'],
        color:          true,
        min:            true,
        max:            true,
        unit:           true,
        yaxe:           ['', 'off', 'left', 'right', 'leftColor', 'rightColor'],
        xaxe:           ['', 'off', 'top', 'bottom', 'topColor', 'bottomColor'],
        thickness:      true,
        shadowsize:     true,
        name:           true,
        commonYAxis:    ['', '1', '2', '3', '4', '5'],
        ignoreNull:     ['false', 'true', '0'],
        smoothing:      false,
        afterComma:     true,
        removeButton:   true
    }
};