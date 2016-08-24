[![Codacy Badge](https://www.codacy.com/project/badge/33b35eefa9844211bae507d390b6c57d)](https://www.codacy.com/app/enelar/ENJS)
[![Code Climate](https://codeclimate.com/github/phoxy/ENJS/badges/gpa.svg)](https://codeclimate.com/github/phoxy/ENJS)
[![Packagist stable](https://img.shields.io/packagist/v/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/enjs)
[![Packagist unstable](https://img.shields.io/packagist/vpre/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/enjs)
[![Packagist license](https://img.shields.io/packagist/l/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/enjs)
[![Packagist total](https://img.shields.io/packagist/dt/phoxy/enjs.svg)](https://packagist.org/packages/phoxy/enjs)

This is *UNCOMPATIBLE* fork from http://embeddedjs.com/
Embedded JavaScript

===
Main differences:

* All rendering templates have their own context. All arguments stored in __this object.
* All ENJS local variables ARE NOT creating in window['var']. They are local
* Any change on __this object wouldn't affect original object, because it isolated
* You could access, review, debug etc ENJS compiled code through source_map in your favorite DevTools
* You could access to first rendered DOM element with __this.first()
* EJS helpers removed
