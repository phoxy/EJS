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
    prepare : function(object, return_canvas)
    {
      var obj = this.template.process(object);
      obj.name = this.name;

      obj.across.Defer(function()
      {
        this.first(true);
      });
      return obj;
    }
    ,
    execute : function(obj)
    {
      obj._EJS_EXECUTE_FUNC.call(obj.across);
      var ret = obj.Render();
      obj.RenderCompleted.call(obj, ancor_id);

      function RandomNumb()
      {
        var ret = "EJS_ANCOR_";

        for (var i = 0; i < 10; i++)
          ret += '0' + Math.floor(Math.random() * 10);

        return ret;
      }

      var ancor_id = RandomNumb();
      var ancor =  "<div id=\"" + ancor_id + "\" class='ejs_ancor'></div>";

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
        ancor.parentNode.removeChild(ancor);
        return this.first();
      };

      obj.html = ancor + ret;
      return ret;
    }
    ,
    render : function(object, return_canvas)
    {
      var obj = this.prepare(object);
      this.execute(obj);

      if (return_canvas)
        return obj;
      return obj.html;
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

      if (options.precompiled)
      {
        this.template = {process: options.precompiled};
        return EJS.update(this.name, this);
      }
      
      if (options.url)
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
        this.name = this.name || options.url;

        template = EJS.get(this.name, this.cache);
        
        if (template == EJS.INVALID_PATH)
          return null;
        
        if (template)
          return this.template = template;
          
        try
        {
          addon = !this.cache ? ('?' + Math.random()) : '';
          if ((this.text = EJS.request(options.url + addon)) == null)
            throw null;
        } catch(e)
        {
          throw( {type: 'EJS', message: 'There is no template at ' + options.url} );
        }
      }
      else
      if (options.element)
      {
        var element = options.element;
        if (typeof element == 'string')
          if((element = document.getElementById(element)) == null)
            throw options.element + 'does not exist!';

        this.text = element.value || element.innerHTML;
        this.name = element.id;
        this.type = '[';
        options.element = element;
      }

      var template = new EJS.Compiler(this.text, this.type);

      template.compile(options, this.name);
      EJS.update(this.name, template);
      this.template = template;
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

  EJS.IsolateContext = function (obj, depth)
  {
    if (obj === null)
      return obj;
    if (typeof obj != "object")
      return obj;
    if (depth !== undefined)
      if (depth-- <= 1)
        return obj;


    var copy = obj.constructor();
    return EJS.IsolateContext.Directly(obj, copy, depth);
  }

  EJS.IsolateContext.Directly = function(obj, into, depth)
  {
    for (var attr in obj)
      if (obj.hasOwnProperty(attr))
        into[attr] = EJS.IsolateContext(obj[attr], depth);
    return into;
  }


  EJS.IsolateNames = ["first", "escape"];  
  EJS.Canvas = function(obj)
  {
    this.across = new EJS.Canvas.across;
    
    for (var k in obj)
      if (obj.hasOwnProperty(k))
        if (EJS.IsolateNames.indexOf(k) == -1)
          this.across[k] = EJS.IsolateContext(obj[k], 1);

    var that = this;

    this.across.escape = function()
    {
      return that;
    };
  };
  
  EJS.Canvas.prototype =
  {
    hook_first : function(element)
    {
      return element;
    }
    ,
    RenderCompleted : function(ancor_id)
    {
      // You could overload this method and hook moment between EJS render and first this.Defer
    }
    ,
    html : undefined // Here will be rendered html
    ,
    DrawTo : function(new_canvas)
    {
      var old = this.__canvas;
      this.__canvas = new_canvas || [];
      return old;
    }
    ,
    Append : function(str)
    {
      return this.__canvas.push(str);
    }
    ,
    Render : function(str)
    {
      return this.__canvas.join('');; 
    }
  };
  
  EJS.Canvas.across = function() {}
  
  EJS.Canvas.across.prototype =
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
    first : function(cb)
    {
      if (typeof cb == 'function')
        return this.Defer(function()
          {
            cb.apply(this.first());
          });

      if (cb)
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
    ,
    XSSEscape : function(str)
      {
        return ("" + str)
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
      }
    ,
    GetAppendMethod : function()
    {
      var that = this.escape();
      return function()
      {
        return that.Append.apply(that, arguments);
      };
    }
  };

  /* Code below DEEP internal
   * Do not waste your time.
   * TODO: Refactor
   */

  EJS.Compiler = function(source, left)
  {
    this.construct.apply(this, arguments);
  };

  EJS.Compiler.prototype =
  {
    construct: function(source, left)
    {
      this.pre_cmd = ['__context.escape().DrawTo([])'];
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
    }
    ,
    process: function(_CONTEXT)
    {
      var ret = new EJS.Canvas(_CONTEXT);

      ret._EJS_EXECUTE_FUNC = this.ejs_functor;
      return ret;
    }
    ,
    compile: function(options, name)
    {
      options = options || {};

      this.tokenize(options);
      /*
        (function()
        {
          var __context = this;
          var __append = this.GetAppendMethod();
          // HERE WILL BE CODE COMPILED FROM EJS
        })
      */

      var to_be_evaled =
        '//' + name + '\n\
        (function()\n\
        {\n\
          var __context = this;\n\
          var __append = this.GetAppendMethod();\n'
          // HERE WILL BE CODE COMPILED FROM EJS
          + this.out
          + '\n\
        })\n';

      try
      {
        this.ejs_functor = eval(to_be_evaled);
      }
      catch(e)
      {
        this.report_error(e, arguments, this.out);
      }
    }
    ,
    tokenize: function(options)
    {
      this.out = '';
      var put_cmd = "__append(";
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
          case scanner.left_at:
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
            case scanner.left_at:
              buff.push("\n" + insert_cmd + "(__context.XSSEscape(EJS.Scanner.to_text(" + content + "))))");
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
    }
    ,
    report_error : function(e, args, code)
    {
      if (typeof JSHINT !== 'undefined')
        VALIDATE = JSHINT;
      else if (typeof JSLINT !== 'undefined')
        VALIDATE = JSLINT;
      else
      {
        console.log("Error: We detected fatal errors, but cant locate them. Import JSLINT");
        console.log("Error: Somewhere in the " + args.name + " we found " + e);
        console.log("Error: We strongly recomend you include JSHINT", "http://jshint.com/install/");
        throw "EJS Execution failed";
      }

      VALIDATE(code);
      var first_e = null;
      var i = 0;

      console.log("Begin " + args.name + " error report ====");
      while (VALIDATE.errors[i] != null)
      {
        var error = VALIDATE.errors[i++];

        switch (error.raw)
        { // Ignore strict level warnings
          case undefined:
          case "Expected '{a}' at column {b}, not column {c}.":
          case "Move 'var' declarations to the top of the function.":
          case "Unexpected space between '{a}' and '{b}'.":
          case "Unnecessary semicolon.":
          case "Missing semicolon.":
          case "Forgotten 'debugger' statement?":
            continue;
        }

        error.line--;

        var e = new Error();

        if (args.options.view)
          e.fileName = args.options.view;

        if (first_e === null)
          first_e = error;

        console.log([error], "Error: " + error.reason, {lineNumber: error.line});
      }
      console.log("End " + args.name + " error report ====");

      throw first_e;
    }
  };
   
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
        left_at:          left + '%@',
        left_comment:     left + '%#'})

    this.SplitRegexp = 
        left == '['
      ? // what the hack
        /(\[%%)|(%%\])|(\[%=)|(\[%@)|(\[%#)|(\[%)|(%\]\n)|(%\])|(\n)/
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
            + this.left_at
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
