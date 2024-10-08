'use strict';

const gulp       = require('gulp');
const fs         = require('node:fs');
const pkg        = require('./package.json');
const iopackage  = require('./io-package.json');
const uglify     = require('gulp-uglify');
const concat     = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const htmlmin    = require('gulp-htmlmin');
const translate  = require('./lib/tools.js').translateText;
const { deleteFoldersRecursive } = require('@iobroker/build-tools')

const fileName = 'words.js';
let languages =  {
    en: {},
    de: {},
    ru: {},
    pt: {},
    nl: {},
    fr: {},
    it: {},
    es: {},
    pl: {},
    uk: {},
    'zh-cn': {}
};

function lang2data(lang, isFlat) {
    let str = isFlat ? '' : '{\n';
    let count = 0;
    for (const w in lang) {
        if (lang.hasOwnProperty(w)) {
            count++;
            if (isFlat) {
                str += (lang[w] === '' ? (isFlat[w] || w) : lang[w]) + '\n';
            } else {
                const key = '  "' + w.replace(/"/g, '\\"') + '": ';
                str += key + '"' + lang[w].replace(/"/g, '\\"') + '",\n';
            }
        }
    }
    if (!count) return isFlat ? '' : '{\n}';
    if (isFlat) {
        return str;
    } else {
        return str.substring(0, str.length - 2) + '\n}';
    }
}

function readWordJs(src) {
    try {
        let words;
        if (fs.existsSync(src + 'js/' + fileName)) {
            words = fs.readFileSync(src + 'js/' + fileName).toString();
        } else {
            words = fs.readFileSync(src + fileName).toString();
        }

        const lines = words.split(/\r\n|\r|\n/g);
        let i = 0;
        while (!lines[i].match(/^systemDictionary = {/)) {
            i++;
        }
        lines.splice(0, i);

        // remove last empty lines
        i = lines.length - 1;
        while (!lines[i]) {
            i--;
        }
        if (i < lines.length - 1) {
            lines.splice(i + 1);
        }

        lines[0] = lines[0].replace('systemDictionary = ', '');
        lines[lines.length - 1] = lines[lines.length - 1].trim().replace(/};$/, '}');
        words = lines.join('\n');
        const resultFunc = new Function('return ' + words + ';');

        return resultFunc();
    } catch (e) {
        return null;
    }
}
function padRight(text, totalLength) {
    return text + (text.length < totalLength ? new Array(totalLength - text.length).join(' ') : '');
}
function writeWordJs(data, src) {
    let text = '// DO NOT EDIT THIS FILE!!! IT WILL BE AUTOMATICALLY GENERATED FROM src/i18n\n';
    text += '/*global systemDictionary:true */\n';
    text += '\'use strict\';\n\n';

    text += 'systemDictionary = {\n';
    for (const word in data) {
        if (data.hasOwnProperty(word)) {
            text += '    ' + padRight('"' + word.replace(/"/g, '\\"') + '": {', 50);
            let line = '';
            for (const lang in data[word]) {
                if (data[word].hasOwnProperty(lang)) {
                    line += '"' + lang + '": "' + padRight(data[word][lang].replace(/"/g, '\\"') + '",', 50) + ' ';
                }
            }
            if (line) {
                line = line.trim();
                line = line.substring(0, line.length - 1);
            }
            text += line + '},\n';
        }
    }
    text += '};';

    if (fs.existsSync(src + 'js/')) {
        fs.writeFileSync(src + 'js/' + fileName, text);
    } else {
        fs.writeFileSync(src + '' + fileName, text);
    }
}

const EMPTY = '';

function words2languages(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const l in langs) {
            if (!langs.hasOwnProperty(l)) continue;
            const keys = Object.keys(langs[l]);
            //keys.sort();
            let obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            if (!fs.existsSync(src + 'i18n/' + l)) {
                fs.mkdirSync(src + 'i18n/' + l);
            }

            fs.writeFileSync(src + 'i18n/' + l + '/translations.json', lang2data(obj));
        }
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}
function words2languagesFlat(src) {
    const langs = Object.assign({}, languages);
    const data = readWordJs(src);
    if (data) {
        for (const word in data) {
            if (data.hasOwnProperty(word)) {
                for (const lang in data[word]) {
                    if (data[word].hasOwnProperty(lang)) {
                        langs[lang][word] = data[word][lang];
                        //  pre-fill all other languages
                        for (const j in langs) {
                            if (langs.hasOwnProperty(j)) {
                                langs[j][word] = langs[j][word] || EMPTY;
                            }
                        }
                    }
                }
            }
        }
        const keys = Object.keys(langs.en);
        //keys.sort();
        for (const l in langs) {
            if (!langs.hasOwnProperty(l)) continue;
            let obj = {};
            for (let k = 0; k < keys.length; k++) {
                obj[keys[k]] = langs[l][keys[k]];
            }
            langs[l] = obj;
        }
        if (!fs.existsSync(src + 'i18n/')) {
            fs.mkdirSync(src + 'i18n/');
        }
        for (const ll in langs) {
            if (!langs.hasOwnProperty(ll)) continue;
            if (!fs.existsSync(src + 'i18n/' + ll)) {
                fs.mkdirSync(src + 'i18n/' + ll);
            }

            fs.writeFileSync(src + 'i18n/' + ll + '/flat.txt', lang2data(langs[ll], langs.en));
        }
        fs.writeFileSync(src + 'i18n/flat.txt', keys.join('\n'));
    } else {
        console.error('Cannot read or parse ' + fileName);
    }
}
function languagesFlat2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    let langs = {};
    let bigOne = {};
    const order = Object.keys(languages);
    dirs.sort((a, b) => {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB) return 1;
            if (posA < posB) return -1;
            return 0;
        }
    });
    const keys = fs.readFileSync(src + 'i18n/flat.txt').toString().split('\n');

    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') continue;
        const lang = dirs[l];
        const values = fs.readFileSync(src + 'i18n/' + lang + '/flat.txt').toString().split('\n');
        langs[lang] = {};
        keys.forEach(function (word, i) {
            langs[lang][word] = values[i].replace(/<\/ i>/g, '</i>').replace(/<\/ b>/g, '</b>').replace(/<\/ span>/g, '</span>').replace(/% s/g, ' %s');
        });

        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['pt', 'fr', 'nl', 'flat.txt'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w]
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1) return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}
function languages2words(src) {
    const dirs = fs.readdirSync(src + 'i18n/');
    const langs = {};
    const bigOne = {};
    const order = Object.keys(languages);
    dirs.sort((a, b) => {
        const posA = order.indexOf(a);
        const posB = order.indexOf(b);
        if (posA === -1 && posB === -1) {
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        } else if (posA === -1) {
            return -1;
        } else if (posB === -1) {
            return 1;
        } else {
            if (posA > posB) return 1;
            if (posA < posB) return -1;
            return 0;
        }
    });
    for (let l = 0; l < dirs.length; l++) {
        if (dirs[l] === 'flat.txt') continue;
        const lang = dirs[l];
        langs[lang] = fs.readFileSync(src + 'i18n/' + lang + '/translations.json').toString();
        langs[lang] = JSON.parse(langs[lang]);
        const words = langs[lang];
        for (const word in words) {
            if (words.hasOwnProperty(word)) {
                bigOne[word] = bigOne[word] || {};
                if (words[word] !== EMPTY) {
                    bigOne[word][lang] = words[word];
                }
            }
        }
    }
    // read actual words.js
    const aWords = readWordJs();

    const temporaryIgnore = ['pt', 'fr', 'nl', 'it'];
    if (aWords) {
        // Merge words together
        for (const w in aWords) {
            if (aWords.hasOwnProperty(w)) {
                if (!bigOne[w]) {
                    console.warn('Take from actual words.js: ' + w);
                    bigOne[w] = aWords[w]
                }
                dirs.forEach(function (lang) {
                    if (temporaryIgnore.indexOf(lang) !== -1) return;
                    if (!bigOne[w][lang]) {
                        console.warn('Missing "' + lang + '": ' + w);
                    }
                });
            }
        }

    }

    writeWordJs(bigOne, src);
}

gulp.task('words2languages', done => {
    words2languages('./src/');
    done();
});

gulp.task('words2languagesFlat', done => {
    words2languagesFlat('./src/');
    done();
});

gulp.task('languagesFlat2words', done => {
    languagesFlat2words('./src/');
    done();
});

gulp.task('languages2words', done => {
    languages2words('./src/');
    done();
});


gulp.task('updateEditHtml', done => {
    let text = fs.readFileSync('./src/edit.html').toString('utf-8');
    let newText = text.replace(/Version: \d+\.\d+\.\d+<\/div>/, `Version: ${pkg.version}</div>`);
    if (newText !== text) {
        fs.writeFileSync('./src/edit.html', newText);
    }
    done();
});

gulp.task('clean', done => {
    deleteFoldersRecursive('./www');
    fs.existsSync('src/js/words.js') && fs.unlinkSync('src/js/words.js');
    done();
});

gulp.task('flotJS', () => {
    return gulp.src([
        './src/lib/js/jquery.flot.min.js',
        './src/lib/js/jquery.flot.resize.min.js',
        './src/lib/js/jquery.flot.time.min.js',
        './src/lib/js/jquery.flot.categories.min.js',
        './src/lib/js/jquery.flot.spline.min.js',
        './src/lib/js/jquery.flot.selection.min.js',
        './src/lib/js/jquery.flot.hiddengraphs.js',
        './src/lib/js/jquery.flot.fillbetween.js',
        './src/lib/js/jquery.flot.navigate.min.js',
        './src/lib/js/jquery.flot.dashes.js',
        './src/lib/js/jquery.flot.grow.js',
        './src/lib/js/jquery-deparam.js',
        './src/js/days.js',
        './src/js/chart.js',
        './src/js/data.js'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('flot.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./www/js'));
});

gulp.task('editJS', gulp.series('languages2words', () => {
    return gulp.src([
        './src/lib/js/jquery-deparam.js',
        './src/lib/js/jquery.colorpicker.js',
        './src/js/words.js',
        './src/js/settings.js',
        './src/js/edit.js'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('edit.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./www/js'));
}));

gulp.task('presetHTML', () => {
    return gulp.src([
        './src/preset.html'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('preset.html'))
        .pipe(htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./www/'));
});
gulp.task('indexHTML', () => {
    return gulp.src([
        './src/index.html'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('index.html'))
        .pipe(htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./www/'));
});
gulp.task('editHTML', gulp.series('updateEditHtml', () => {
    return gulp.src([
        './src/edit.html'
    ])
        .pipe(sourcemaps.init())
        .pipe(concat('edit.html'))
        .pipe(htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./www/'));
}));

gulp.task('copyCSS', () => {
    return gulp.src([
        './src/lib/css/**/*'
    ])
        .pipe(gulp.dest('./www/css'));
});

gulp.task('copyImg', () => {
    return gulp.src([
        './src/img/favicon.png'
    ])
        .pipe(gulp.dest('./www/img'));
});

gulp.task('translate', async function (done) {
    let yandex;
    const i = process.argv.indexOf("--yandex");
    if (i > -1) {
        yandex = process.argv[i + 1];
    }

    if (iopackage && iopackage.common) {
        if (iopackage.common.news) {
            console.log("Translate News");
            for (let k in iopackage.common.news) {
                console.log("News: " + k);
                let nw = iopackage.common.news[k];
                await translateNotExisting(nw, null, yandex);
            }
        }
        if (iopackage.common.titleLang) {
            console.log("Translate Title");
            await translateNotExisting(iopackage.common.titleLang, iopackage.common.title, yandex);
        }
        if (iopackage.common.desc) {
            console.log("Translate Description");
            await translateNotExisting(iopackage.common.desc, null, yandex);
        }

        if (fs.existsSync('./src/i18n/en/translations.json')) {
            let enTranslations = require('./src/i18n/en/translations.json');
            for (let l in languages) {
                console.log("Translate Text: " + l);
                let existing = {};
                if (fs.existsSync('./src/i18n/' + l + '/translations.json')) {
                    existing = require('./src/i18n/' + l + '/translations.json');
                }
                for (let t in enTranslations) {
                    if (!existing[t]) {
                        existing[t] = await translate(enTranslations[t], l, yandex);
                    }
                }
                if (!fs.existsSync('./src/i18n/' + l + '/')) {
                    fs.mkdirSync('./src/i18n/' + l + '/');
                }
                fs.writeFileSync(`./src/i18n/${l}/translations.json`, JSON.stringify(existing, null, 4));
            }
        }

    }
    fs.writeFileSync('io-package.json', JSON.stringify(iopackage, null, 4));
});

async function translateNotExisting(obj, baseText, yandex) {
    let t = obj['en'];
    if (!t) {
        t = baseText;
    }

    if (t) {
        for (let l in languages) {
            if (!obj[l]) {
                const time = new Date().getTime();
                obj[l] = await translate(t, l, yandex);
                console.log(`en -> ${l} ${new Date().getTime() - time} ms`);
            }
        }
    }
}

gulp.task('default', gulp.series('flotJS', 'editJS', 'indexHTML', 'presetHTML', 'editHTML', 'copyCSS', 'copyImg'));
