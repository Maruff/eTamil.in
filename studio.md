---
layout: page
title: Studio — forms (preview)
section: Studio
permalink: /studio/
lang: en
key: studio
summary: >-
  Design a form with fields, calculations and checks, and use it straight away. The
  calculations are real eTamil, worked out by the real compiler in your browser.
description: >-
  A first look at eTamil Studio: a form builder whose calculations are eTamil, run by the
  compiler built to WebAssembly, exact to the paisa, with nothing sent to a server.
---

A **preview** of the first piece of eTamil Studio. Describe a form on the left: the **fields**
a person types, the **calculations** worked out from them, and the **checks** that say when
something is wrong. The form appears on the right, and works as you build it.

The calculations are not a formula language of their own. Each one is an eTamil expression, and
the form is run by the same compiler as everything else on this site, built to WebAssembly in your
browser, so `250.50` with 18% GST comes to `295.59`, never `295.58999…`. Open *The eTamil this form
runs* to read the program it makes.

{% include form-builder.html %}

**What this does not do yet.** It stores nothing: the form's design is kept in your browser and can
be exported and imported, and the values you type are not kept anywhere. There is no database, no
generated server and no sign-in. A form is its fields, its calculations and its checks. Those come
next, in that order, once this part has been tried.

The formulas can use anything the language has: arithmetic, comparisons, text joined with `&`, and the
built-in functions. Names are written the way eTamil writes them (`qokY` is தொகை, `vikiqam` is
விகிதம், `vari` is வரி), and a name that is also a keyword will be refused by the compiler with its own
message, shown against the calculation it is in.
