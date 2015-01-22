(function() {
  var INCLUDE, MarkdownIt, ROOT, crypto, fs, highlight, hljs, includeDirective, includeReplace, jade, md, moment, path, protagonist, slug;

  crypto = require('crypto');

  fs = require('fs');

  hljs = require('highlight.js');

  jade = require('jade');

  MarkdownIt = require('markdown-it');

  moment = require('moment');

  path = require('path');

  protagonist = require('protagonist');

  INCLUDE = /( *)<!-- include\((.*)\) -->/gmi;

  ROOT = path.dirname(__dirname);

  slug = function(value) {
    return value.toLowerCase().replace(/[ \t\n]/g, '-');
  };

  highlight = function(code, lang) {
    if (lang) {
      if (lang === 'no-highlight') {
        return code;
      } else {
        return hljs.highlight(lang, code).value;
      }
    } else {
      return hljs.highlightAuto(code).value;
    }
  };

  includeReplace = function(includePath, match, spaces, filename) {
    var content, fullPath, lines;
    fullPath = path.join(includePath, filename);
    lines = fs.readFileSync(fullPath, 'utf-8').replace(/\r\n?/g, '\n').split('\n');
    content = spaces + lines.join("\n" + spaces);
    return includeDirective(path.dirname(fullPath), content);
  };

  includeDirective = function(includePath, input) {
    return input.replace(INCLUDE, includeReplace.bind(this, includePath));
  };

  md = MarkdownIt('default', {
    html: true,
    linkify: true,
    typographer: true,
    highlight: highlight
  });

  exports.getTemplates = function(done) {
    return fs.readdir(path.join(ROOT, 'templates'), function(err, files) {
      var f;
      if (err) {
        return done(err);
      }
      return done(null, ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          f = files[_i];
          if (f[0] !== '_') {
            _results.push(f);
          }
        }
        return _results;
      })()).map(function(item) {
        return item.replace(/\.jade$/, '');
      }));
    });
  };

  exports.collectPathsSync = function(input, includePath) {
    var paths;
    paths = [];
    input.replace(INCLUDE, function(match, spaces, filename) {
      var content, fullPath;
      fullPath = path.join(includePath, filename);
      paths.push(fullPath);
      content = fs.readFileSync(fullPath, 'utf-8');
      return paths = paths.concat(exports.collectPathsSync(content, path.dirname(fullPath)));
    });
    return paths;
  };

  exports.render = function(input, options, done) {
    var filteredInput;
    if (typeof options === 'string' || options instanceof String) {
      options = {
        template: options
      };
    }
    if (options.template == null) {
      options.template = 'default';
    }
    if (options.filterInput == null) {
      options.filterInput = true;
    }
    if (options.condenseNav == null) {
      options.condenseNav = true;
    }
    if (options.fullWidth == null) {
      options.fullWidth = false;
    }
    if (options.includePath == null) {
      options.includePath = process.cwd();
    }
    input = includeDirective(options.includePath, input);
    filteredInput = !options.filterInput ? input : input.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    return protagonist.parse(filteredInput, function(err, res) {
      var key, locals, templatePath, value, _ref;
      if (err) {
        err.input = filteredInput;
        return done(err);
      }
      locals = {
        api: res.ast,
        condenseNav: options.condenseNav,
        fullWidth: options.fullWidth,
        date: moment,
        highlight: highlight,
        markdown: function(content) {
          return md.render(content);
        },
        slug: slug,
        hash: function(value) {
          return crypto.createHash('md5').update(value.toString()).digest('hex');
        }
      };
      _ref = options.locals || {};
      for (key in _ref) {
        value = _ref[key];
        locals[key] = value;
      }
      if (fs.existsSync(options.template)) {
        templatePath = options.template;
      } else {
        templatePath = path.join(ROOT, 'templates', "" + options.template + ".jade");
      }
      return jade.renderFile(templatePath, locals, function(err, html) {
        if (err) {
          return done(err);
        }
        res.warnings.input = filteredInput;
        return done(null, html, res.warnings);
      });
    });
  };

  exports.renderFile = function(inputFile, outputFile, options, done) {
    var render;
    render = function(input) {
      return exports.render(input, options, function(err, html, warnings) {
        if (err) {
          return done(err);
        }
        if (outputFile !== '-') {
          return fs.writeFile(outputFile, html, function(err) {
            return done(err, warnings);
          });
        } else {
          console.log(html);
          return done(null, warnings);
        }
      });
    };
    if (inputFile !== '-') {
      if (options.includePath == null) {
        options.includePath = path.dirname(inputFile);
      }
      return fs.readFile(inputFile, {
        encoding: 'utf-8'
      }, function(err, input) {
        if (err) {
          return done(err);
        }
        return render(input.toString());
      });
    } else {
      process.stdin.setEncoding('utf-8');
      return process.stdin.on('readable', function() {
        var chunk;
        chunk = process.stdin.read();
        if (chunk != null) {
          return render(chunk);
        }
      });
    }
  };

}).call(this);
