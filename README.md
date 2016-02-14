![Logo](admin/flot.png)
ioBroker.flot
=================

[![NPM version](http://img.shields.io/npm/v/iobroker.flot.svg)](https://www.npmjs.com/package/iobroker.flot)
[![Downloads](https://img.shields.io/npm/dm/iobroker.flot.svg)](https://www.npmjs.com/package/iobroker.flot)

[![NPM](https://nodei.co/npm/iobroker.flot.png?downloads=true)](https://nodei.co/npm/iobroker.flot/)

Draw charts with [flot](http://www.flotcharts.org/)

## Changelog
### 0.2.5 (2016-02-14)
* (Pmant) add ignore null per state
* (Pmant) change commonYAxis per state

### 0.2.4 (2016-01-31)
* (ldsign) Title/help attribute for lineWidth and ShadowSize table head
* (ldsign) option for shadowSize
* (nobodyMO) Add option commonYAxis
* (bluefox) add favicon and title

### 0.2.3 (2016-01-26)
* (ldsign) user selectable time (hours/minutes) for static timeArt

### 0.2.2 (2015-12-17)
* (bluefox) fix SelectID for safary

### 0.2.1 (2015-12-14)
* (Smiling_Jack) support of new History concept
* (Smiling_Jack) new editor & working on axis
* (bluefox) add onchange aggregation
* (Smiling_Jack) add ignoreNull
* (Smiling_Jack) working on flot nav
* (bluefox) import old settings

### 0.1.1 (2015-07-13)
* (bluefox) fix time format

### 0.1.0 (2015-07-10)
* (bluefox) lines are implemented

### 0.0.2 (2015-07-09)
* (bluefox) implement title and sort points

### 0.0.1 (2015-03-27)
* (bluefox) initial commit

### How to use
- install "web"-adapter and create one instance if not installed.
- Select in settings of "web"-adapter the instance of installed "socket.io"-instance.
- install "flot"-adapter and call
- Go to http://ip:8082/flot/edit.html