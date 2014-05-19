(function()
{
  var rsplit, chop, extend;
  
  EJS = function( options )
  {
    this.construct.apply(this, arguments);
  };

  /* @Prototype*/
  EJS.prototype =
  {
    render : function(object)
    {
      var obj = this.template.process(object);
      var ret = obj._EJS_EXECUTE_FUNC.call(obj.across);

      function RandomNumb()
      {
        var ret = "EJS_ANCOR_";

        for (var i = 0; i < 10; i++)
          ret += '0' + Math.floor(Math.random() * 10);

        return ret;
      }

      var ancor_id = RandomNumb();
      var ancor =  "<div id=\"" + ancor_id + "\" ></div>";

      var hook = obj.hook_first;

      obj.across.first = function()
      {
        if (typeof(obj.first) != 'undefined')
          return hook(obj.first);

        var ancor = document.getElementById(ancor_id);
        if (ancor == null)
          return null;
        var elem = ancor;
        do
        {
          elem = elem.nextSibling;
        } while (elem && elem.nodeType !== 1);
        
        obj.first = elem;
        ancor.remove();
        return this.first();
      };

      obj.across.Defer(function()
      {
        this.first(true);
      });
      return ancor + ret;
    }
    ,
    update : function(element, options)
    {
      if(typeof element == 'string')
        element = document.getElementById(element);

      if(options == null)
      {
        _template = this;
        return function(object)
        {
          EJS.prototype.update.call(_template, element, object);
        }
      }

      if(typeof options == 'string')
      {
        params = {};
        params.url = options;
        _template = this;
        params.onComplete = function(request)
        {
          var object = eval(request.responseText)
          EJS.prototype.update.call(_template, element, object)
        }

        EJS.ajax_request(params)
      }
      else
        element.innerHTML = this.render(options)
    }
    ,
    construct : function(options)
    {
      if (typeof options == "string")
        options = {view: options};
      
      this.set_options(options);
      if(options.precompiled)
        return this.option_routes.precompiled(options);

      if(options.element)
        options = this.option_routes.element(options);
      else if (options.url)
        options = this.option_routes.url(options);

      var template = new EJS.Compiler(this.text, this.type);

      template.compile(options, this.name);

      EJS.update(this.name, this);
      this.template = template;
    }
    ,
    option_routes :
    {
      precompiled : function(options)
      {
        this.template = {};
        this.template.process = options.precompiled;
        EJS.update(this.name, this);
        return options;
      }
      ,
      element : function()
      {
        if(typeof options.element == 'string')
        {
          var name = options.element;
          
          options.element = document.getElementById(options.element)
          if(options.element == null)
            throw name+'does not exist!'
        }

        if(options.element.value)
        {
          this.text = options.element.value
        }
        else
          this.text = options.element.innerHTML

        this.name = options.element.id
        this.type = '['
        
        return options;
      }
      ,
      url : function()
      {
        var endExt = function(path, match)
        {
          if(!path)
            return null;

          match.lastIndex = 0;
          if (!match.test(path))
            path += this.ext;
          return path;
        };

        options.url = endExt(options.url, this.extMatch);
        if (!this.name)
          this.name = options.url;

        var url = options.url
        //options.view = options.absolute_url || options.view || options.;
        var template = EJS.get(this.name /*url*/, this.cache);

        if (template)
          return template;
        if (template == EJS.INVALID_PATH)
          return null;
        try
        {
          var tmpurl = url;
          if (!this.cache)
            tmpurl += '?' + Math.random();

          this.text = EJS.request(tmpurl);
        } catch(e) {}

        if(this.text == null)
        {
          throw( {type: 'EJS', message: 'There is no template at ' + url} );
        }
        //this.name = url;
      }
    }
    ,
    out : function()
    {
      return this.template.out;
    }
    ,

    /**
     * Sets options on this view to be rendered with.
     * @param {Object} options
     */
    set_options : function(options)
    {
      this.type = options.type || EJS.type;
      this.cache = options.cache != null ? options.cache : EJS.cache;
      this.text = options.text || null;
      this.name =  options.name || null;
      this.ext = options.ext || EJS.ext;
      this.extMatch = new RegExp(this.ext.replace(/\./, '\.'));
    }
  };
  
  EJS.endExt = function(path, match)
  {
    if(!path)
      return null;
    
    match.lastIndex = 0;
    if (!match.test(path))
      path += this.ext;
    return path;
  }
  
  EJS.Canvas = function(obj)
  {
    for (var k in obj)
      if (obj.hasOwnProperty(k))
        this.across[k] = obj[k];
  };
  
  EJS.Canvas.prototype =
  {
    across :
    {
      Defer : function(cb, time)
      {
        var that = this;
        setTimeout(function()
        {
          cb.apply(that);
        }, time);
      }
      ,
      first : function(safe)
      {
        if (safe)
          return;
        console.log(
          "EJS.Canvas",
          "EJS.Canvas.first() called to early. Use EJS.Canvas.Defer, or any other delay method",
          this._EJS_EXECUTE_FUNC);

        // Maybe you trying access first element to early.
        // Firstly all design rendering as text, and storing as string.
        // Your javascript helping render it(probably you called ejs.first() from that timing)
        // Secondly if client want to, rendered design attach to DOM page (and ejs.first() gets enabled)
        // Try using setTimeout(..., 0) or phoxy.Defer(..., 0) to catch into
      }
    }
    ,
    hook_first : function(element)
    {
      return element;
    }
  };

  EJS.Compiler = function(source, left)
  {
    this.pre_cmd = ['var ___ViewO = []'];
    this.post_cmd = new Array();
    this.source = ' ';  

    if (source != null)
    {
      if (typeof source == 'string')
      {
        source = source.replace(/\r\n/g, "\n");
        source = source.replace(/\r/g,   "\n");
        this.source = source;
      }
      else if (source.innerHTML)
        this.source = source.innerHTML;
      
      if (typeof this.source != 'string')
        this.source = "";
    }

    left = left || '<';
    var right = '>';

    switch(left)
    {
    case '[':
      right = ']';
      break;
    case '<':
      break;
    default:
      throw left + ' is not a supported deliminator';
      break;
    }

    this.scanner = new EJS.Scanner(this.source, left, right);
    this.out = '';
  };

  EJS.Compiler.prototype =
  {
    compile: function(options, name)
    {
      options = options || {};
      this.out = '';
      var put_cmd = "___ViewO.push(";
      var insert_cmd = put_cmd;
      var buff = new EJS.Buffer(this.pre_cmd, this.post_cmd);    
      var content = '';

      var clean = function(content)
      {
        content = content.replace(/\\/g, '\\\\');
        content = content.replace(/\n/g, '\\n');
        content = content.replace(/"/g,  '\\"');
        return content;
      };

      this.scanner.scan(function(token, scanner)
      {
        if (scanner.stag == null)
        {
          switch(token)
          {
          case '\n':
            content = content + "\n";
            buff.push(put_cmd + '"' + clean(content) + '");');
            buff.cr();
            content = '';
            break;
          case scanner.left_delimiter:
          case scanner.left_equal:
          case scanner.left_comment:
            scanner.stag = token;
            if (content.length > 0)
              buff.push(put_cmd + '"' + clean(content) + '")');
            content = '';
            break;
          case scanner.double_left:
            content = content + scanner.left_delimiter;
            break;
          default:
            content = content + token;
            break;
          }
        }
        else
        {
          switch(token)
          {
          case scanner.right_delimiter:
            switch(scanner.stag)
            {
            case scanner.left_delimiter:
              if (content[content.length - 1] == '\n')
              {
                content = chop(content);
                buff.push(content);
                buff.cr();
              }
              else
              {
                buff.push(content);
              }
              break;
            case scanner.left_equal:
              buff.push("\n" + insert_cmd + "(EJS.Scanner.to_text(" + content + ")))");
              break;
            }

            scanner.stag = null;
            content = '';
            break;
          case scanner.double_right:
            content = content + scanner.right_delimiter;
            break;
          default:
            content = content + token;
            break;
          }
        }
      });

      if (content.length > 0)
      {
        // Chould be content.dump in Ruby
        buff.push(put_cmd + '"' + clean(content) + '")');
      }

      buff.close();
      this.out = buff.script + ";";
/*
  this.process = function(_CONTEXT)
  {
    this.ejs_functor = function()
    {
      var __context = this;
      // HERE WILL BE CODE COMPILED FROM EJS
      return ___ViewO.join("");
    };

    this.process = function(_CONTEXT)
    {
      var ret = new EJS.Canvas(_CONTEXT);

      ret._EJS_EXECUTE_FUNC = this.ejs_functor;
      return ret;
    }

    return this.process(_CONTEXT);
  }; 
  */
      var to_be_evaled = 
       '/*'
       + name
       + '*/\n'
       + '\n\
  this.process = function(_CONTEXT)\n\
  {\n\
    this.ejs_functor = function()\n\
    {\n\
      var __context = this;\n'
      // HERE WILL BE CODE COMPILED FROM EJS
    + this.out
    + '\n\
      return ___ViewO.join("");\n\
    };\n\
\n\
    this.process = function(_CONTEXT)\n\
    {\n\
      var ret = new EJS.Canvas(_CONTEXT);\n\
\n\
      ret._EJS_EXECUTE_FUNC = this.ejs_functor;\n\
      return ret;\n\
    };\n\
\n\
    return this.process(_CONTEXT);\n\
  };\n';
      
      try
      {
        eval(to_be_evaled);
      }
        catch(e)
      {
        if(typeof JSLINT == 'undefined')
        {
          console.log("We strongly recomend you include JSLINT", "https://github.com/douglascrockford/JSLint");
          throw e;
        }

        JSLINT(this.out);
        var first_e = null;

        for (var i = 0; i < JSLINT.errors.length; i++)
        {
          var error = JSLINT.errors[i];
          if(error.reason != "Unnecessary semicolon.")
          {
            error.line++;

            var e = new Error();

            e.lineNumber = error.line;
            e.message = error.reason;

            if(options.view)
              e.fileName = options.view;

            if (first_e === null)
              first_e = e;

            console.log("Detected JSError: ", error, e);
          }
        }

        throw first_e;
      }
    }
  };

  /* Code below DEEP internal
   * Do not waste your time.
   * TODO: Refactor
   */
   
  EJS.config = function(options)
  {
    EJS.cache = options.cache != null ? options.cache : EJS.cache;
    EJS.type = options.type != null ? options.type : EJS.type;
    EJS.ext = options.ext != null ? options.ext : EJS.ext;
    
    var templates_directory = EJS.templates_directory; //nice and private container

    if (!EJS.templates_directory)
      EJS.templates_directory = templates_directory = {}
    
    EJS.get = function(path, cache)
    {
      if(cache == false)
        return null;

      if(templates_directory[path])
        return templates_directory[path];

      return null;
    };
    
    EJS.update = function(path, template)
    { 
      if(path == null)
        return;
      templates_directory[path] = template;
    };
    
    EJS.INVALID_PATH = -1;
  };

  EJS.config( {cache: true, type: '<', ext: '.ejs' } );


  /**
   * @constructor
   * By adding functions to EJS.Helpers.prototype, those functions will be available in the 
   * views.
   * @init Creates a view helper.  This function is called internally.  You should never call it.
   * @param {Object} data The data passed to the view.  Helpers have access to it through this._data
   */
  EJS.Helpers = function(data, extras)
  {
    this._data = data;
    this._extras = extras;
    extend(this, extras );
  };
  /* @prototype*/
  EJS.Helpers.prototype = 
  {
    /**
     * Renders a new view.  If data is passed in, uses that to render the view.
     * @param {Object} options standard options passed to a new view.
     * @param {optional:Object} data
     * @return {String}
     */

    view: function(options, data, helpers)
    {
      if(!helpers)
        helpers = this._extras

      if(!data)
        data = this._data;

      return new EJS(options).render(data, helpers);
    },

    /**
     * For a given value, tries to create a human representation.
     * @param {Object} input the value being converted.
     * @param {Object} null_text what text should be present if input == null or undefined, defaults to ''
     * @return {String} 
     */
    to_text: function(input, null_text)
    {
      if(input == null || input === undefined)
        return null_text || '';
      
      if(input instanceof Date)
        return input.toDateString();
      
      if(input.toString)
        return 
          input
            .toString()
            .replace(/\n/g, '<br />')
            .replace(/''/g, "'");
      
      return '';
    }
  };
  
  /* @Static*/
  EJS.Scanner = function(source, left, right)
  {
    extend(
      this,
      {
        left_delimiter:   left + '%',
        right_delimiter:  '%'  + right,
        double_left:      left + '%%',
        double_right:     '%%' + right,
        left_equal:       left + '%=',
        left_comment:     left + '%#'})

    this.SplitRegexp = 
        left == '['
      ?
        /(\[%%)|(%%\])|(\[%=)|(\[%#)|(\[%)|(%\]\n)|(%\])|(\n)/
      : 
        new RegExp
          (
            '('
            + this.double_left
            + ')|(%%'
            + this.double_right
            + ')|('
            + this.left_equal
            + ')|('
            + this.left_comment
            + ')|('
            + this.left_delimiter
            + ')|('
            + this.right_delimiter
            + '\n)|('
            + this.right_delimiter
            + ')|(\n)'
          );

    this.source = source;
    this.stag = null;
    this.lines = 0;
  };

  EJS.Scanner.to_text = function(input)
  {
    if(input == null || input === undefined)
      return '';

    if(input instanceof Date)
      return input.toDateString();

    if(input.toString) 
      return input.toString();

    return '';
  };

  EJS.Scanner.prototype =
  {
    scan: function(block)
    {
      scanline = this.scanline;
      regex = this.SplitRegexp;
     
      if (!this.source == '')
      {
        var source_split = rsplit(this.source, /\n/);

        for(var i = 0; i < source_split.length; i++)
        {
          var item = source_split[i];
          this.scanline(item, regex, block);
        }
      }
    },
    scanline: function(line, regex, block)
    {
      this.lines++;
      
      var line_split = rsplit(line, regex);
      
      for(var i = 0; i < line_split.length; i++)
      {
        var token = line_split[i];
        if (token == null)
          continue;

        try
        {
          block(token, this);
        } catch(e)
        {
          throw {type: 'EJS.Scanner', line: this.lines};
        }
      }
    }
  };


  EJS.Buffer = function(pre_cmd, post_cmd)
  {
    this.line = new Array();
    this.script = "";
    this.pre_cmd = pre_cmd;
    this.post_cmd = post_cmd;
    
    for (var i = 0; i < this.pre_cmd.length; i++)
      this.push(pre_cmd[i]);
  };

  EJS.Buffer.prototype = 
  {
    push: function(cmd)
    {
      this.line.push(cmd);
    },

    cr: function()
    {
      this.script = this.script + this.line.join('; ');
      this.line = new Array();
      this.script = this.script + "\n";
    },

    close: function()
    {
      if (this.line.length <= 0)
        return;

      for (var i = 0; i < this.post_cmd.length; i++)
        this.push(pre_cmd[i]);

      this.script = this.script + this.line.join('; ');
      line = null;
    }
  };


  EJS.newRequest = function()
  {
    var factories =
    [
      function()
      { 
        return new ActiveXObject("Msxml2.XMLHTTP");
      },
      function()
      { 
        return new XMLHttpRequest();
      },
      function()
      {
        return new ActiveXObject("Microsoft.XMLHTTP");
      }
    ];

    for(var i = 0; i < factories.length; i++)
    {
      var ret = null;
      var func = factories[i];

      try
      {
        ret = func();
      }
      catch(e)
      {
        continue;
      }

      newRequest = func;
      return ret;
    }
    
    throw "Request object type not found";
  }
    
  EJS.request = function(path)
  {
    var request = new EJS.newRequest()
    request.open("GET", path, false);

    try
    {
      request.send(null);
    }
    catch(e)
    {
      return null;
    }

    if (request.status == 404)
      return null;
    if (request.status == 2)
      return null;

    if (request.status == 0 && request.responseText == '') 
      return null;

    return request.responseText
  }

  EJS.ajax_request = function(params)
  {
    if (!params.method)
      params.method = 'GET';

    var request = new EJS.newRequest();

    request.onreadystatechange = function()
    {
      if(request.readyState != 4)
        return;

      // WHAT???
      if(request.status == 200)
      {
        params.onComplete(request);
      }
      else
      {
        params.onComplete(request);
      }
    }
    
    request.open(params.method, params.url)
    request.send(null)
  }
  
  var rsplit = function(string, regex)
  {
    var 
      result = regex.exec(string),
      retArr = new Array(),
      first_idx, 
      last_idx, 
      first_bit;

    while (result != null)
    {
      first_idx = result.index;
      last_idx = regex.lastIndex;

      if ((first_idx) != 0)
      {
        first_bit = string.substring(0,first_idx);
        retArr.push(string.substring(0,first_idx));
        string = string.slice(first_idx);
      }    

      retArr.push(result[0]);
      string = string.slice(result[0].length);
      result = regex.exec(string);  
    }
    
    if (!string == '')
      retArr.push(string);
    return retArr;
  };

  var chop =  function(string)
  {
    return string.substr(0, string.length - 1);
  };

  var extend = function(d, s)
  {
    for(var n in s)
      if(s.hasOwnProperty(n))
        d[n] = s[n]
  }
})();
