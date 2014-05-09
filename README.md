This is *UNCOMPATIBLE* fork from http://embeddedjs.com/
Embedded JavaScript

===
Main differences:
* All rendering EJS have their own context. All arguments stored in this object (dublicated to local variable __context).
* All EJS local variables ARE NOT creating in window['var']. They are local.
* You could access, review, invoke etc EJS compiled code with this._EJS_EXECUTE_FUNC
* You could access to first rendered DOM element with this.first()
* EJS helpers removed
* EJS include (planned).
