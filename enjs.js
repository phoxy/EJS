(function()
{
  var rsplit, chop, extend;

  EJS = function( options, cb )
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
      return obj;
    }
    ,
    execute : function(obj)
    {
      // Generate DOM context ancors
      obj.ancor_id = EJS.RandomNumb();
      var ancor = EJS.CreateAncor(obj.ancor_id);

      // Begin search first context element as soon as possible
      obj.shedule_dom_discovery();

      // Execute EJS, make it draw into virtual canvas
      obj._EJS_EXECUTE_FUNC(obj.across);

      // Dump virtual canvas into string
      var ret = obj.Render();

      // Inform system that render completed
      obj.RenderCompleted.call(obj, obj.ancor_id);

      // Return resulting html to client
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
    construct : function(options, cb)
    {
      if (typeof options == "string")
        options = {view: options};
      this.set_options(options);

      if (options.precompiled)
      {
        this.template = {process: options.precompiled};
        return EJS.update(this.name, this);
      }

      var that = this;
      function ProcessTemplate(text)
      {
        var template = new EJS.Compiler(text, that.type);

        template.compile(options, that.name);
        EJS.update(that.name, template);
        that.template = template;

        if (typeof cb == 'function')
          cb(that);
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

        this.template = EJS.get(this.name, this.cache);

        if (this.template == EJS.INVALID_PATH)
          this.template = null;

        if (this.template)
        {
          if (typeof cb == 'function')
            cb(this);

          return this;
        }

        try
        {
          addon = !this.cache ? ('?' + Math.random()) : '';

          if (typeof cb !== 'function')
          {
            if ((this.text = EJS.request(options.url + addon)) == null)
              throw null;
          }
          else
          { // async
            return EJS.request(options.url + addon, ProcessTemplate);
          }

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

      if (this.text)
        ProcessTemplate(this.text);
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

  EJS.IsolationDepth = 2;
  EJS.IsolateNames = ["first", "escape", "__append"];

  EJS.IsolateContext.Directly = function(obj, into, depth)
  {
    for (var attr in obj)
      if (obj.hasOwnProperty(attr))
        if (EJS.IsolateNames.indexOf(attr) == -1)
          into[attr] = EJS.IsolateContext(obj[attr], depth);
    return into;
  }

  EJS.RandomNumb = function()
  {
    var ret = "EJS_ANCOR_";

    for (var i = 0; i < 10; i++)
      ret += '0' + Math.floor(Math.random() * 10);

    return ret;
  };

  EJS.CreateAncor = function(ancor_id)
  {
    return  "<div id=\"" + ancor_id + "\" class='ejs_ancor'></div>";
  };

  EJS.SheduleDomContextDiscovery = function(ancor, context)
  {


    context.escape().shedule_dom_discovery();
  };


  EJS.Canvas = function(obj)
  {
    this.across = new EJS.Canvas.across;
    EJS.IsolateContext.Directly(obj, this.across, EJS.IsolationDepth);

    var that = this;

    this.across.escape = function()
    {
      return that;
    };

    this.DrawTo([])
    this.completed = false;
    this.defered_functions = [];
  };

  EJS.Canvas.BestContext = function(a, b)
  {
    if (a instanceof EJS.Canvas.across)
      return a;
    return b;
  }

  EJS.Canvas.prototype =
  {
    get_first_context_dom_element : function(ancor_id)
    {
      if (typeof(this.first_dom_element_cached) != 'undefined')
        return this.first_dom_element_cached;

      var ancor = document.getElementById(ancor_id);
      if (ancor == null)
        return null;

      var elem = ancor;
      do
      {
        elem = elem.nextSibling;
      } while (elem && elem.nodeType !== 1);

      this.first_dom_element_cached = this.hook_first(elem);

      return this.get_first_context_dom_element();
    },
    execute_defered_functions: function()
    {
      for (var k in this.defered_functions)
        this.defered_functions[k].call(this.across);
    }
    ,
    hook_first : function(element)
    {
      return element;
    }
    ,
    RenderCompleted : function(ancor_id)
    {
      this.completed = true;
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
    ,
    try_discover_dom: function()
    {
      var ancor_element = document.getElementById(this.ancor_id);
      if (!ancor_element)
        return false;

      clearInterval(this.dom_shedule_timer);
      this.execute_defered_functions();
      return true;
    }
    ,
    shedule_dom_discovery: function()
    {
      var that = this;

      var attempt = 0;
      var frequency = 0.1;
      var timeout = 10;

      var check = function()
      {
        attempt++;
        if (attempt > timeout / frequency)
        {
          console.log("ENJS: Unable to find ancor in " + timeout + "s. Abort");
          clearInterval(that.dom_shedule_timer);
        }

        that.try_discover_dom();
      };

      that.dom_shedule_timer = setInterval(check, 1000 * frequency);

      that.across.Defer(function try_find_first_dom_element()
      {
        that.get_first_context_dom_element(that.ancor_id);
      });

      that.across.Defer(function remove_ancor()
      {
        var ancor_element = document.getElementById(that.ancor_id);
        ancor_element.parentNode.removeChild(ancor_element);
      });
    }
    ,
  };

  EJS.Canvas.across = function()
  {
  }

  EJS.Canvas.across.prototype =
  {
    Defer : function(cb, time)
    {
      var escape = this.escape();

      if (time <= 0 || !time)
        return escape.defered_functions.push(cb);

      console.log("ENJS: __this.Defer with time is deprecated");
      var timeout = function(that)
      {
        setTimeout(function defer()
        {
          cb.apply(that);
        }, time);
      };

      this.Defer(timeout);
    }
    ,
    first : function(cb)
    {
      var canvas = this.escape();

      if (canvas.completed)
      {
        var element = canvas.get_first_context_dom_element();
        if (element == null)
          console.log
          (
            "EJS.Canvas",
            "EJS.Canvas.first() return's NULL context",
            this._EJS_EXECUTE_FUNC
          );
        return element;
      }

      var context = this;
      if (typeof cb == 'function')
        return context.Defer(function EJS_force_calculate_first()
        {
          cb.apply(context.first());
        });

      if (cb)
        return;

      console.log
      (
        "EJS.Canvas",
        "EJS.Canvas.first() called to early. Use EJS.Canvas.Defer, or any other delay method",
        this._EJS_EXECUTE_FUNC
      );

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
    __append : function()
    { // Lube your brain, friend
      var that = this.escape();
      this.__append = function()
      {
        return that.Append.apply(that, arguments);
      };

      return this.__append.apply(this, arguments);
    }
    ,
    __BestContext : function(other_context)
    {
      return EJS.Canvas.BestContext(other_context, this);
    }
    ,
    __AppendToBestContext : function(other_context)
    {
      var args = [].slice.call(arguments);

        other_context = args.shift();
      var my_context = this !== window ? this : args.shift();

      var best_context = my_context.__BestContext(other_context);
      return my_context.__append.apply(best_context, args);
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
      this.pre_cmd = [];
      this.post_cmd = [];
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
        (function file_name(__this)
        {
          // Simplify average look by using this abbreviations
          var _T = __this, _BC = __this.__BestContext, _ABC = __AppendToBestContext, _A = "__append", _X = __this.XSSEscape, _S = EJS.Scanner.to_text;
          // Begin of user code
          // HERE WILL BE CODE COMPILED FROM EJS
          // End of user code
        })
      */

      var func_name = name.replace(/\W/g, "_");
      var source_url = (options.domain || "") + name;

      var to_be_evaled =
        '//' + name + '\n\
        (function ' + func_name + '(__this)\n\
        {\n\
          // Simplify average look by using this abbreviations\n\
          var _T = __this, _BC = _T.__BestContext, _ABC = _T.__AppendToBestContext, _X = __this.XSSEscape, _S = EJS.Scanner.to_text;\n\
          // Begin of user code\n\
          \n'
          // HERE WILL BE CODE COMPILED FROM EJS
          + this.out
          + '\n\
          // End of user code\n\
        })\n'
          + '//# sourceURL=' + source_url + '\n';


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
      var put_cmd = ";_ABC(this,_T,";
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
              buff.push("\n" + insert_cmd + "_X(_S(" + content + ")))");
              break;
            case scanner.left_equal:
              buff.push("\n" + insert_cmd + "_S(" + content + "))");
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

  EJS.request = function(path, callback)
  {
    var request = new EJS.newRequest()
    var async = typeof callback === 'function';

    request.open("GET", path, async);
    request.onreadystatechange = function ejs_on_request_ready()
    {
      if (request.readyState > 3 && async)
        callback(request.responseText, request);
    };

    try
    {
      request.send(null)
    } catch(e)
    {
      return null;
    }

    if (async)
      return;

    if (request.status == 404)
      return null;
    if (request.status == 2)
      return null;

    if (request.status == 0 && request.responseText == '')
      return null;

    return request.responseText;
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
