# words

Our links storage is a naïve solution. we store one word record with a zillion links

a smarter solution _(but ultimately more costly)_ would be to store the links as records, and have the lookup be a StartWith query
then deploying new matching criteria would be a simple lookup miss, and we wouldn't have to manually invalidate anything

the alternative strategy would be to go whole-hog on this, and do the dedupeLinks operation on lookup and store a 1:1 with the query shape
big reads & writes, but ultimately even faster than now

We should **probably** pick a strategy. Sound money says the links method is the right call for a larger scale

### TODO
1. sort by most matching overlaps
1. cache layer test with a simple lru
