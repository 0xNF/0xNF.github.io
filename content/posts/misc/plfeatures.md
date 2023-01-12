---
title: "Programming Language Features I'd Like Most Languages To Have"
date: 2023-01-10T12:19:34+09:00
draft: false
description: "Things I'd like to see more of"
categories:
- misc
tags:
- misc
---

Here are some things I am dissappointed to leave behind when I switch back and forth between languages that dont have certain features.


# If Expressions
## Found in: Rust; probably other functional languages
## Irritatingly missing from: Everything


```Rust
let x =  5 + if true { 
    1
} else {
     7
}
println!("{x}"); // 6
```

What I have to do instead:
```csharp
let x = 5;
if true {
    x += 1;
} else {
    x += 7;
}
System.Console.WriteLine($"{x}");
```

# Ternary
## Found In: Everywhere except Go

Ternaries are like If Expressions but less powerful

```csharp
int i = if true ? 5 : 7;
```

What I have to do intead:
```go
var i int
if true {
    i = 5
} else {
    i = 7
}
```

# For-Else Blocks
## Found in: Python
## Irritatingly Missing From: Everything

```python
def for_else(arr):
    for i in range(len(arr)):
        print(f"loop at {i}")
    else:
        print("Arr was empty")

for_else([]) # "Arr was empty"
```

What I have to do instead:
```cs
void for_else(arr: List<int>) {
    List<int> arr = new List<int>();
    if arr.length() == 0 {
        System.Console.WriteLine("Arr was empty");
    } else {
        for(int i = 0; i < arr.length(); i++) {
            System.Console.WriteLine($"Loop at {idx}");
        }
    }
}
```

# Result Types
## Found in: Rust; Haskell; any of the OCaml derived languages
## Irritatingly Missing From: Everything
```Rust
fn r(b: bool) -> Result<u32> {
    if b {
        Some(5)
    } else {
        None
    }
}

let r_t = r(true).unwrap(); // 5
let r_f = r(false); // None
```

What I have to do instead:
```csharp
int? r(bool b) {
    if (b) {
        return 5;
    } else {
        return null;
    }
}
var r_t = r(true); // 5
var r_f = r(false); // null
```

# Built-in Tuples
## Found In: C#; Rust; Python; Most functional languages
## Irritatingly Missing From: Older C#

```cs
var tup = (1,"a");
System.Console.WriteLine(tup.Item1); // "1"
System.Console.WriteLine(tup.Item2); // "a"
```


What I have to do instead:

```csharp
var tup = new Tuple2<int, string>(1, "s");
```
or even worse, define my own custom tuple type:
```csharp
struct Tup2<T1, T2> {
    T1 Item1;
    T2 Item2;
}
var tup = new Tup2<int, string>(1, "s");
```

# Destructuing
## Found In C#; Python; Rust; JavaScript; Most functional languages
## Irritatingly Missing From: Older C#
```cs
(int, string) f() {
    return (5, "s");
}

(int t_num, string t_str) = f();

System.Console.WriteLine($"t_num: {t_num}; t_str: {t_str}"); // "t_num: 5; t_str: s"
```

What I have to do instead:

```csharp
Tuple2<int, string> f() {
    return new Tuple2<int, string>(5, "s");
}
var tup = f();
int t_num = tup.Item1;
string t_str = tup.Item2;
```



# Negative Array Indexes
## Found In: Python; Rust (kind of)
## Not Found In: Everywhere else
```python
arr = ["a", "b", "c"]
print(arr[-1]) // "c"
```

What I have to do intead:
```csharp
List<string> arr = new List<string>(){ "a", "b", "c" };
int len = arr.length;
int idx = len - 2;
System.Console.WriteLine($"{arr[idx]}"); // "c"
```

# Trailing Commas for all list-like structures
## Found In: Python; Go; Rust; C# (lists only)
## Not Found In: C# (func parameters); JSON

C# has this for literal lists:
```cs
List<int> lst = new List<int>() {
    1,
    2,
    3,
};
```

While Go also has it for function parameter lists:
```go
func f(param_a int, param_b int,) {
    
}
```

What I have to do instead: Meticulously prune commas and re-order elements whenever the list structure changes:

```csharp
List<int> lst = new List<int>() {
    2,
    1,
    3
}
```

# Numeral Separators
## Found In: C#; Go; JavaScript;
## Not Found In: Dart;

```cs
int i = 1_500_000;
System.Console.WriteLine($"{i}"); // 1500000
```

# Byte Literals
## Found In: C#; Go; JavaScript;
```cs
int i = 0xFF;
System.Console.WriteLine($"{i}"); // 255
```


# Typed Range Literals
## Found In: ADA
I've never used these because they dont exist in any language except ADA, but I really wish they were more common. 

```ADA
with Ada.Text_IO; use Ada.Text_IO;

procedure Learn is
   subtype Alphabet is Character range 'A' .. 'Z';

begin

   Put_Line ("Learning Ada from " & Alphabet'First & " to " & Alphabet'Last);

end Learn;
```

# Default Function Parameters
## Found In: C#; JavaScript; Python; Most languages tbh
```dart
void f(int i = 0, String a = "abc") {
    print("{i} and {a}");
}

f(); // "0 and abc"
f(5); // "5 and abc"
f(10, "xyz"); // "10 and xyz"
```

What I have to do instead:

```cs
void f(int i, String a) {
    ...
}
f(0, "abc");
```

# Function Overloading
## Notably missing from: Dart

```cs
string f(int i) {
    return "int";
}
string f(string s) {
    return "string";
}
string f(SomeStruct s) {
    retrun "Struct";
}

SomeStruct ss = new SomeStruct();

List<Object> l = new List<Object>() {
    5,
    "hello",
    new SomeStruct(),
};

let x = l.select(x => f(x)).ToList(); // ["int", "string", "Struct"]
```

What I have to do instead:

```dart
String f_int(int i) {
    return "int";
}
String f_str(String i) {
    return "string";
}
String f_class(Object i) {
    return "Object";
}

List<Object> l  = [
    5,
    "hello",
    SomeStruct(),
];

var l2 = l.map((x) {
    switch (x.runtimeType) {
        case int:
            return f_int(x as int);
        case String:
            return f_str(x as String);
        default:
            return f_class(x);
    }
});
```



# Chained Evaluators
## Found In: Nowhere?

```cs

bool f(int n) {
    return 1 < x < 10;
}
f(5); // true
f(11) // false
f(0)  // false
```

What I have to do instead:
```cs
bool f(int n) {
    return (1 < x) && (x < 10);
}
```

# Object Assigment Shorthand
## Found In: Rust; Go
```rust
struct S {
    id: i32
    name: String
}

let name: String = "xyz";
let id: i32 = 0

/// But using shorthand, as long as the symbol name and the field name are the same,
/// the field name can be omitted in favor of the symbol
let s_short: S {
    name,
    id
}
```

What I have to do instead:

```rust
struct S {
    id: i32
    name: String
}

let name: String = "xyz";
let id: i32 = 0

let s_long: S {
    name: name,
    id: id,
}
```

# Spread
## Found In: JavaScript; Dart;
This one has many uses, including spreading arguments into function call parameter lists but what I wnat to focus on is the ability to create new lists and objects. Taken from the MDN docs:

```JavaScript
const parts = ['shoulders', 'knees'];
const lyrics = ['head', ...parts, 'and', 'toes'];
```

What I have to do instead:

```JavaScript
const parts = ['shoulders', 'knees'];
const head = ["head"];
const lyrics = head.concat(["shoulders", "knees"]);
lyrics.push("and");
lyrics.push("toes");
```

# Null Coalesce
## Found In: C#; JavaScript;

```csharp
string may_be_null(bool b) {
    if (b) {
        return null;
    } else {
        return "some value";
    }
}

var x = may_be_null(true) ?? "WasNull";
var y = may_be_null(false) ?? "WasNull";
System.Console.WriteLine(x); // "WasNull"
System.Console.WriteLine(y); // "some value"

```

# Null Chain
## Found In: C#; JavaScript;

```csharp
string may_be_null(bool b) {
    if (b) {
        return null;
    } else {
        return "some value";
    }
}

may_be_null(true)?.ToUpper()?.split("_"); // null
may_be_null(false)?.ToUpper()?.split("_"); // ["SOME", "VALUE"]
```

# If Let
## Found In: Rust; Kotlin
```Rust
foo?.let { baz(it) }
```

Instead, I have to do:

```cs
if (foo != null) {
  baz(foo);
} else {
  null;
}
```