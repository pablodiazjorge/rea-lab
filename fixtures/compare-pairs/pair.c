// Function-comparison fixture (rea issue #1947). One source, three variants:
//   VARIANT 1  base
//   VARIANT 2  relocation only: an extra function and an extra string come first, so every later
//              function and datum moves, while the compared functions keep the same code
//   VARIANT 3  real changes on top of variant 2: one constant and one call target change
// The compared functions are noinline so each one survives -O2 as its own procedure.

#include <stdio.h>
#include <string.h>

#ifndef VARIANT
#define VARIANT 1
#endif

#if VARIANT >= 2
__attribute__((used, noinline)) static int shift_layout(int value) {
  static const char padding[] = "this function and string only move what follows";
  return value * 31 + (int)strlen(padding) + (value % 5);
}
#endif

static const char greeting[] = "rea-lab compare pairs";

__attribute__((noinline)) static int helper(int value) { return value * 7 + 3; }

#if VARIANT == 3
__attribute__((noinline)) static int other_helper(int value) { return value * 9 + 1; }
#endif

// Unchanged in every variant.
__attribute__((noinline)) int unchanged(int value) { return helper(value) + (int)strlen(greeting); }

// Variant 3 changes the constant.
#if VARIANT == 3
__attribute__((noinline)) int changed_constant(int value) { return value % 4 == 0; }
#else
__attribute__((noinline)) int changed_constant(int value) { return value % 3 == 0; }
#endif

// Variant 3 changes the call target.
#if VARIANT == 3
__attribute__((noinline)) int changed_call(int value) { return other_helper(value); }
#else
__attribute__((noinline)) int changed_call(int value) { return helper(value); }
#endif

int main(int argc, char **argv) {
  (void)argv;
  int total = unchanged(argc) + changed_constant(argc) + changed_call(argc);
#if VARIANT >= 2
  total += shift_layout(argc);
#endif
  printf("%d\n", total);
  return 0;
}
