[![Codacy Badge](https://www.codacy.com/project/badge/33b35eefa9844211bae507d390b6c57d)](https://www.codacy.com/app/enelar/ENJS)
[![Code Climate](https://codeclimate.com/github/phoxy/ENJS/badges/gpa.svg)](https://codeclimate.com/github/phoxy/ENJS)
[![Packagist stable](https://img.shields.io/packagist/v/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/phoxy)
[![Packagist unstable](https://img.shields.io/packagist/vpre/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/phoxy)
[![Packagist license](https://img.shields.io/packagist/l/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/phoxy)
[![Packagist total](https://img.shields.io/packagist/dt/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/phoxy)

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
