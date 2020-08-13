# gulp-include-source

Gulp plugin to include scripts and styles into your HTML files automatically.

## Important notice
This is a modification of the original package gulp-include-source.
It is optimized for:
- Excluding single files 
- De-duplicating the include list
- It should mostly be used if you want your include instructions file to be the same file where the actual include statements will later go to!

If these optimization are not important for you, use the original!



## Install

Install with [npm](https://npmjs.org/package/gulp-ngmin)

```
npm install @maxgeldner/gulp-include-source-extended --save-dev
```



## Example and explanation

#### gulpfile.js

```js
const generateInclude = () => {
  return gulp.src('./index.html')
    .pipe(includeSources())
    .pipe(gulp.dest('./'));
};
```

#### index.html
Your file should consist of two areas:
```html
<gulp-include-instructions></gulp-include-instructions>
```
And 
```html
<gulp-include></gulp-include>
```

The first area should contain instructions what to include:
- Files that should be added to the output can be marked with `<!-- include:js(...) -->`.
- Files that should NOT be added to the output can be marked with `<!-- !include:js(...) -->`. **Always add these files to
the very beginning of your include list!** You cannot exclude directories or placeholder names (until now).

The second area is the area where the **actual** include statements will go to. It stays empty at the beginning. It will be filled when you execute the gulp task! It will be overriden on every execute!

Your file list will not contain duplicated include statements at the end.

```html
<html>
<head>
  <!-- include:css(style/**/*.css) -->
</head>
<body>
  <gulp-include-instructions>
      <!-- !include:js(script/myFolder/badScript.js) -->
      <!-- include:js(list:vendorList) -->
      <!-- include:js(script/**/*.js) -->
  </gulp-include-instructions>
    
  <gulp-include></gulp-include>
</body>
</html>
```

Will result in:
```html
<html>
<head>
  <!-- include:css(style/**/*.css) -->
</head>
<body>
  <gulp-include-instructions>
      <!-- !include:js(script/myFolder/badScript.js) -->
      <!-- include:js(index.js) -->
      <!-- include:js(script/**/*.js) -->
  </gulp-include-instructions>
    
  <gulp-include>
    <script src="index.js"></script>
    <script src="script/myFolder/myScript.js"></script>
    <script src="script/index.js"></script>
    <!-- And everything else that is in the script folder -->
  </gulp-include>
</body>
</html>
```


## API

### includeSources(options)

#### options.cwd

Type: `String`

Base directory from where the plugin will search for source files.

#### options.scriptExt

Type: `String`

When available, will override script extension in resulted HTML code.

#### options.styleExt

Type: `String`

When available, will override style extension in resulted HTML code.



## License

MIT © [André Gil](http://somepixels.net)

Modified by Max Geldner
