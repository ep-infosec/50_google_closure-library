load("@io_bazel_rules_closure//closure:defs.bzl", "closure_js_library")

package(default_visibility = ["//visibility:public"])

licenses(["notice"])

closure_js_library(
    name = "asserts",
    testonly = True,
    srcs = ["asserts.js"],
    lenient = True,
    deps = ["//closure/goog/testing:jsunit"],
)
