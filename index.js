'use strict';

var through = require('through2'),
  glob = require('glob'),
  path = require('path'),
  replaceExt = require('replace-ext'),
  gutil = require('gulp-util'),
  fs = require('fs'),
  PluginError = gutil.PluginError;

var PLUGIN_NAME = 'gulp-include-source';

var placeholders = {
  'js' : '<script src="%"></script>',
  'css' : '<link rel="stylesheet" href="%">'
};

// These are the tags that define the instruction and the statements area in the give file. Escape slashes!
let tags = {
  instructions: ['<gulp-include-instructions>', '<\/gulp-include-instructions>'],
  statements: ['<gulp-include>', '<\/gulp-include>']
};

var alreadyMergedFiles = [];

function matchExpressions(contents) {
  return contents.match(/<!--\s+include:([a-z]+)\(([^)]+)\)\s+-->/);
}

/**
 * The expression that defines files that should not be included into the output.
 */
function matchNotExpression(contents) {
  return contents.match(/<!--\s+!include:([a-z]+)\(([^)]+)\)\s+-->/);
}

function replaceExtension(filename, type, options) {

  if( options.scriptExt && type === 'js' ) {
    filename = replaceExt(filename, '.' + options.scriptExt);
  } else if( options.styleExt && type === 'css' ) {
    filename = replaceExt(filename, '.' + options.styleExt);
  }

  return filename;
}

function parseFiles(source, cwd) {

  if( source.indexOf('list:') === 0 ) {
    var cleanSrc = source.replace('list:', '');
    return fs.readFileSync( cleanSrc ).toString().split('\n');
  }

  return glob.sync( source, { cwd : cwd } );
}

/**
 * Deletes files that were already added to the output, from the given list of files.
 * @param filesToCheck The list of files to check if files are included that were already added.
 * @return {*} A cleaned array.
 */
function deleteDuplicates(filesToCheck) {
  return filesToCheck.filter((file) => {
    return !alreadyMergedFiles.includes(file);
  });
}

/**
 * Finds the relevant part, the one with the instructions, from the content string.
 * @param content The full content of the file.
 * @return {*} Only the instruction comments.
 */
function prepareContent(content) {
  let regex = new RegExp("(" + tags.instructions[0] + ").*(" + tags.instructions[1] + ")", "gms")
  let prepared = [...content.matchAll(regex)][0]
  return prepared[0].replace(prepared[1], '').replace(prepared[2], '')
}

function injectFiles(file, options) {
  // The full content of the read file. Will be used later to build the file again.
  let fullContent = file.contents.toString();
  // Only the content that matters to the plugin. Will be used the replace the include instructions for includes statements.
  var contents = prepareContent(file.contents.toString());

  // Adds files that should not be included to the alreadyMergedFiles array. They will be ignored in the while loop.
  contents.replace('\r\n', '\n').split('\n').forEach((line) => {
    let lineMatches = matchNotExpression(line);
    if (lineMatches !== null) {
      alreadyMergedFiles.push(lineMatches[2]);
      contents = contents.replace(lineMatches[0], '');
    }
  });
  var cwd = options.cwd || path.dirname(file.path);
  var matches = matchExpressions(contents);

  // Iterate over all lines, replace the instructions with the statements (only in the content string, fullContent stays untouched!).
  while(matches) {
    var type = matches[1];
    var placeholder = placeholders[ type ];
    var files = deleteDuplicates(parseFiles(matches[2], cwd));
    alreadyMergedFiles.push(...files);

    var includes = '';

    if(placeholder && files && files.length > 0) {
      includes = files.map(function(filename) {
        filename = replaceExtension(filename, type, options);
        return placeholder.split('%').join(filename);
      }).join('\n');
    }

    // Concats: Everything fro start of file to the position of the current match + the include statement(s) + everything from the end of the include comment to the end of the file
    contents = contents.substring(0, matches.index) + includes + contents.substring(matches.index + matches[0].length);
    matches = matchExpressions(contents);
  }

  // Find indexes where the statment tags start and end.
  let gulpIncludeStartPos = fullContent.indexOf(tags.statements[0]) + tags.statements[0].length;
  let gulpIncludeEndPos = fullContent.indexOf(tags.statements[1]);

  // Delete any content that before was in the statement tag.
  fullContent = fullContent.slice(0, gulpIncludeStartPos) + fullContent.slice(gulpIncludeEndPos);

  // Include the generated statements into the statement tags body.
  let modifiedContent = [fullContent.slice(0, gulpIncludeStartPos),
    contents,
    fullContent.slice(gulpIncludeStartPos)].join('');

  // Modified content now is the complete content (the instructions, the statements and the whole rest of the file).
  return modifiedContent;
}

function gulpIncludeSource(options) {

  options = options || {};

  var stream = through.obj(function(file, enc, callback) {

    if (file.isNull()) {
      this.push(file); // Do nothing if no contents
      return callback();
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported!'));
      return callback();
    }

    if (file.isBuffer()) {
      try {
        file.contents = new Buffer( injectFiles( file, options ) );
      } catch (err) {
        this.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
      }
    }

    this.push(file);
    return callback();
  });

  return stream;
}

module.exports = gulpIncludeSource;
