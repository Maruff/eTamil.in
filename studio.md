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

**Take it with you.** Under the preview, two buttons turn the form into eTamil programs that need
nothing but eTamil installed. *The app* is a small web server with this form as its page:
`etamil --server --port 8080 pativam_cEvY.qmz`, then open `http://localhost:8080`. *A terminal program*
asks for each field in turn: `etamil pativam_kaNakku.qmz`. Both work the form out with one eTamil function,
so they give the answers the preview gives.

**Keep the records.** Switch on *Keep a record of each submission* and the app also saves what is
submitted, in a SQLite file next to it (`pativu.db`, or whatever you call the table). It gains a *Save* button, a
list of the latest records at `/paqivukaL` and a CSV at `/paqivukaL.csv`. A form with a bad field or a failed check is
not saved, and says why. A record keeps the amounts exactly and says which design saved it. Names must then be Latin
letters, digits and `_`, the project's romanization, and the builder tells you when one is not. There is **no
sign-in**: the app listens on your computer only, and anyone who can reach it can read the records.

**What this does not do yet.** The records are only ever added, never changed or deleted. There is no sign-in, no
PostgreSQL and no encryption, so do not use it for anything you could not leave on a shared computer. The values you type
into the builder itself are not kept anywhere; its design is kept in your browser and can be exported and imported.

The formulas can use anything the language has: arithmetic, comparisons, text joined with `&`, and the
built-in functions. Names are written the way eTamil writes them (`qokY` is தொகை, `vikiqam` is
விகிதம், `vari` is வரி), and a name that is also a keyword will be refused by the compiler with its own
message, shown against the calculation it is in.
