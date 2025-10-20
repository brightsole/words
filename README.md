# words

[![Auto merge basic check](https://github.com/brightsole/words/actions/workflows/test.yml/badge.svg)](https://github.com/brightsole/words/actions/workflows/test.yml)
[![Dependabot Updates](https://github.com/brightsole/words/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/brightsole/words/actions/workflows/dependabot/dependabot-updates)
[![Deploy to Production](https://github.com/brightsole/words/actions/workflows/deploy.yml/badge.svg)](https://github.com/brightsole/words/actions/workflows/deploy.yml)

Our links storage is a naïve solution. we store one word record with a zillion links

a smarter solution _(but ultimately more costly)_ would be to store the links as records, and have the lookup be a StartWith query
then deploying new matching criteria would be a simple lookup miss, and we wouldn't have to manually invalidate anything

the alternative strategy would be to go whole-hog on this, and do the dedupeLinks operation on lookup and store a 1:1 with the query shape
big reads & writes, but ultimately even faster than now

We should **probably** pick a strategy. Sound money says the links method is the right call for a larger scale

### TODO
1. sort by most matching overlaps


## Words service LRU performance inveestigation results

### pre-LRU

endpoint | n | ok | fail | min_ms | p50_ms | p90_ms | p95_ms | p99_ms | max_ms | mean_ms | std_ms
---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:
REST | 100 | 100 | 0 | 180.63 | 202.51 | 252.65 | 360.03 | 709.23 | 1768.89 | 236.10 | 169.33
GraphQL | 100 | 100 | 0 | 208.61 | 226.62 | 295.03 | 463.16 | 614.96 | 2073.54 | 268.76 | 195.71

comparison | mean_diff_ms | mean_diff_pct | p50_diff_ms | p90_diff_ms | p95_diff_ms | p99_diff_ms
---|---:|---:|---:|---:|---:|---:
GraphQL-REST | 32.66 | 13.84 | 24.11 | 42.38 | 103.13 | -94.27


### LRU

endpoint | n | ok | fail | min_ms | p50_ms | p90_ms | p95_ms | p99_ms | max_ms | mean_ms | std_ms
---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:
REST | 100 | 100 | 0 | 42.18 | 56.16 | 135.88 | 143.42 | 249.25 | 261.55 | 78.01 | 43.66
GraphQL | 100 | 100 | 0 | 53.04 | 67.94 | 134.62 | 140.51 | 145.57 | 169.46 | 81.07 | 30.00

comparison | mean_diff_ms | mean_diff_pct | p50_diff_ms | p90_diff_ms | p95_diff_ms | p99_diff_ms
---|---:|---:|---:|---:|---:|---:
GraphQL-REST | 3.06 | 3.93 | 11.78 | -1.26 | -2.91 | -103.68
